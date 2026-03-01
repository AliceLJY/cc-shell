import { query, listSessions, getSessionMessages } from "@anthropic-ai/claude-agent-sdk"

// Each session tracks SSE connections and pending permissions
interface ActiveSession {
  sessionId: string
  sseControllers: Set<ReadableStreamDefaultController>
  pendingPermissions: Map<string, (result: { behavior: "allow" | "deny"; message?: string }) => void>
  isProcessing: boolean
  abortController?: AbortController // For cancelling in-flight queries
  model: string
  cwd?: string // Original working directory of the session
  eventBuffer: Uint8Array[] // Buffer events until first SSE controller connects
}

const activeSessions = new Map<string, ActiveSession>()

// Remove CLAUDECODE env var to prevent nested session detection
// (CC Shell backend may be launched from within a Claude Code session)
const cleanEnv: Record<string, string | undefined> = { ...process.env }
delete cleanEnv.CLAUDECODE

function sendSSE(session: ActiveSession, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  const encoded = new TextEncoder().encode(payload)
  if (session.sseControllers.size === 0) {
    // No SSE clients connected — buffer the event
    session.eventBuffer.push(encoded)
    return
  }
  let delivered = false
  for (const controller of session.sseControllers) {
    try {
      controller.enqueue(encoded)
      delivered = true
    } catch {
      session.sseControllers.delete(controller)
    }
  }
  // If all controllers failed, re-buffer so new connections can receive it
  if (!delivered) {
    session.eventBuffer.push(encoded)
  }
}

function flushEventBuffer(session: ActiveSession, controller: ReadableStreamDefaultController) {
  for (const encoded of session.eventBuffer) {
    try {
      controller.enqueue(encoded)
    } catch {
      break
    }
  }
  session.eventBuffer = []
}

// Process a query and stream results via SSE
async function processQuery(session: ActiveSession, prompt: string, resumeId?: string) {
  session.isProcessing = true
  const ac = new AbortController()
  session.abortController = ac
  const t0 = Date.now()
  console.log(`[processQuery] START session=${session.sessionId} resume=${resumeId ?? "none"} prompt="${prompt.slice(0, 50)}" sseClients=${session.sseControllers.size}`)
  sendSSE(session, "status", { type: "status", text: "Claude is thinking..." })

  try {
    const q = query({
      prompt,
      options: {
        model: session.model,
        env: cleanEnv,
        ...(resumeId ? { resume: resumeId } : {}),
        ...(session.cwd ? { cwd: session.cwd } : {}),
        signal: ac.signal,
        includePartialMessages: true,
        permissionMode: "default",
        canUseTool: async (toolName, input, opts) => {
          const requestId = opts.toolUseID
          return new Promise((resolve) => {
            // Store resolver — will be resolved when frontend responds
            session.pendingPermissions.set(requestId, resolve)
            sendSSE(session, "permission_request", {
              type: "permission_request",
              request: {
                requestId,
                toolName,
                toolInput: input,
                description: `${toolName}: ${JSON.stringify(input).slice(0, 200)}`,
              },
            })
          })
        },
      },
    })

    let sdkSessionResolved = false

    for await (const msg of q) {
      // Log non-stream events with timing
      if (msg.type !== "stream_event") {
        console.log(`[SDK +${Date.now() - t0}ms] msgType=${msg.type} session=${session.sessionId}`)
      }
      // Capture real session ID from SDK messages (first time only)
      if (msg.session_id && !sdkSessionResolved) {
        sdkSessionResolved = true
        const resolvedSessionId = msg.session_id
        // Register with the real SDK session ID (keep old tempId as alias)
        if (!resumeId && resolvedSessionId !== session.sessionId) {
          session.sessionId = resolvedSessionId
          activeSessions.set(resolvedSessionId, session)
          // Don't delete tempId — frontend may still reference it
        }
        sendSSE(session, "system_init", {
          type: "system_init",
          sessionId: resolvedSessionId,
          model: session.model,
        })
      }

      switch (msg.type) {
        case "assistant": {
          const content = msg.message?.content
          let text = ""
          const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === "text") {
                text += block.text
              } else if (block.type === "tool_use") {
                toolCalls.push({
                  id: block.id,
                  name: block.name,
                  input: block.input as Record<string, unknown>,
                })
              }
            }
          } else if (typeof content === "string") {
            text = content
          }

          sendSSE(session, "assistant_message", {
            type: "assistant_message",
            message: {
              id: msg.uuid,
              role: "assistant",
              content: text,
              timestamp: Date.now(),
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              model: msg.message?.model,
            },
          })
          break
        }

        case "stream_event": {
          const event = msg.event
          if (event?.type === "content_block_delta") {
            const delta = (event as Record<string, unknown>).delta as Record<string, unknown> | undefined
            if (delta?.type === "text_delta" && typeof delta.text === "string") {
              sendSSE(session, "text_delta", {
                type: "text_delta",
                text: delta.text,
              })
            }
          }
          break
        }

        case "result": {
          // Map snake_case SDK fields to camelCase frontend fields
          const resultMsg = msg as Record<string, unknown>
          const sdkUsage = (resultMsg.usage ?? {}) as Record<string, number>
          sendSSE(session, "result", {
            type: "result",
            cost: typeof resultMsg.total_cost_usd === "number" ? resultMsg.total_cost_usd : 0,
            usage: {
              inputTokens: sdkUsage.input_tokens ?? 0,
              outputTokens: sdkUsage.output_tokens ?? 0,
              cacheReadTokens: sdkUsage.cache_read_input_tokens ?? 0,
            },
            duration: typeof resultMsg.duration_ms === "number" ? resultMsg.duration_ms : 0,
          })
          break
        }

        case "system": {
          // SDKSystemMessage has subtype, model, cwd, tools — not a "message" field
          const sysMsg = msg as Record<string, unknown>
          const subtype = sysMsg.subtype as string | undefined
          if (subtype === "init") {
            sendSSE(session, "status", {
              type: "status",
              text: `Session initialized (model: ${sysMsg.model ?? session.model}, cwd: ${sysMsg.cwd ?? "unknown"})`,
            })
          }
          break
        }

        default:
          break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[processQuery] ERROR session=${session.sessionId} resume=${resumeId ?? "none"}: ${message}`)
    if (err instanceof Error && err.stack) console.error(err.stack)
    sendSSE(session, "error", { type: "error", message })
  } finally {
    console.log(`[processQuery] DONE +${Date.now() - t0}ms session=${session.sessionId} resume=${resumeId ?? "none"} sseClients=${session.sseControllers.size}`)
    session.isProcessing = false
    session.abortController = undefined
  }
}

// Get or create an ActiveSession for the given ID (supports resuming historical sessions)
function getOrCreateSession(sessionId: string, model = "claude-sonnet-4-6"): ActiveSession {
  let session = activeSessions.get(sessionId)
  if (!session) {
    session = {
      sessionId,
      sseControllers: new Set(),
      pendingPermissions: new Map(),
      isProcessing: false,
      model,
      eventBuffer: [],
    }
    activeSessions.set(sessionId, session)
  }
  return session
}

function extractSessionId(pathname: string): string | null {
  const match = pathname.match(/^\/api\/sessions\/([^/]+)/)
  return match ? match[1] : null
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

const server = Bun.serve({
  port: 3001,
  idleTimeout: 255, // Max value — SSE connections must stay open
  fetch: async (req) => {
    const url = new URL(req.url)
    const { pathname } = url
    const method = req.method

    // Log all non-OPTIONS requests
    if (method !== "OPTIONS" && !pathname.endsWith("/stream")) {
      console.log(`[HTTP] ${method} ${pathname}`)
    }

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // GET /api/health
    if (pathname === "/api/health" && method === "GET") {
      return Response.json({ status: "ok" }, { headers: corsHeaders })
    }

    // GET /api/models
    if (pathname === "/api/models" && method === "GET") {
      return Response.json(
        ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
        { headers: corsHeaders }
      )
    }

    // GET /api/sessions — list saved sessions
    if (pathname === "/api/sessions" && method === "GET") {
      try {
        const sessions = await listSessions({ limit: 50 })
        const result = sessions.map((s) => ({
          sessionId: s.sessionId,
          summary: s.summary || s.customTitle || "Untitled",
          lastModified: s.lastModified,
          firstPrompt: s.firstPrompt,
          cwd: s.cwd,
        }))
        return Response.json(result, { headers: corsHeaders })
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Failed to list sessions" },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // POST /api/sessions — create new session with first message
    if (pathname === "/api/sessions" && method === "POST") {
      const body = await readBody(req)
      const model = (body.model as string) || "claude-sonnet-4-6"
      const prompt = body.prompt as string
      if (!prompt) {
        return Response.json({ error: "prompt required" }, { status: 400, headers: corsHeaders })
      }

      // Use a temp ID until we get the real one from SDK
      const tempId = crypto.randomUUID()
      const session: ActiveSession = {
        sessionId: tempId,
        sseControllers: new Set(),
        pendingPermissions: new Map(),
        isProcessing: false,
        model,
        eventBuffer: [],
      }
      activeSessions.set(tempId, session)

      // Start processing in background — session ID will be resolved from stream
      processQuery(session, prompt)

      return Response.json({ sessionId: tempId, model }, { headers: corsHeaders })
    }

    // Routes with session ID
    const sessionId = extractSessionId(pathname)
    if (!sessionId) {
      return new Response("Not found", { status: 404, headers: corsHeaders })
    }

    const session = activeSessions.get(sessionId)

    // GET /api/sessions/:id/messages — load historical messages
    if (pathname.endsWith("/messages") && method === "GET") {
      try {
        // Get session's lastModified as fallback timestamp (SDK doesn't provide per-message timestamps)
        const allSessions = await listSessions()
        const sessionInfo = allSessions.find((s) => s.sessionId === sessionId)
        const fallbackTs = sessionInfo?.lastModified ?? 0

        const msgs = await getSessionMessages(sessionId)
        const result = msgs.map((m) => {
          let content = ""
          const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

          const raw = m.message as { content?: unknown; role?: string }
          if (typeof raw.content === "string") {
            content = raw.content
          } else if (Array.isArray(raw.content)) {
            for (const block of raw.content) {
              if (block.type === "text") content += block.text
              else if (block.type === "tool_use") {
                toolCalls.push({ id: block.id, name: block.name, input: block.input })
              }
            }
          }

          return {
            id: m.uuid,
            role: m.type as "user" | "assistant",
            content,
            timestamp: fallbackTs,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          }
        })
        return Response.json(result, { headers: corsHeaders })
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Failed to load messages" },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // GET /api/sessions/:id/stream — SSE endpoint
    if (pathname.endsWith("/stream") && method === "GET") {
      console.log(`[SSE] CONNECT sessionId=${sessionId}`)
      const sseSession = getOrCreateSession(sessionId)

      const stream = new ReadableStream({
        start(controller) {
          sseSession.sseControllers.add(controller)
          // Flush any buffered events from before SSE connected
          flushEventBuffer(sseSession, controller)
          // Send current state
          const payload = `event: system_init\ndata: ${JSON.stringify({
            type: "system_init",
            sessionId: sseSession.sessionId,
            model: sseSession.model,
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(payload))
        },
        cancel(controller) {
          sseSession.sseControllers.delete(controller as ReadableStreamDefaultController)
        },
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // POST /api/sessions/:id/msg — send follow-up message (also works for historical sessions)
    if (pathname.endsWith("/msg") && method === "POST") {
      const body = await readBody(req)
      const content = body.content as string
      if (!content) {
        return Response.json({ error: "content required" }, { status: 400, headers: corsHeaders })
      }

      const msgSession = getOrCreateSession(sessionId, (body.model as string) || "claude-sonnet-4-6")
      // Store cwd if provided (for resuming historical sessions from different directories)
      if (body.cwd && typeof body.cwd === "string") {
        msgSession.cwd = body.cwd
      }
      console.log(`[MSG] sessionId=${sessionId} content="${content.slice(0, 50)}" cwd=${msgSession.cwd ?? "default"} isProcessing=${msgSession.isProcessing} sseClients=${msgSession.sseControllers.size}`)

      if (msgSession.isProcessing) {
        console.log(`[MSG] REJECTED — session busy`)
        return Response.json(
          { error: "Session is busy processing a previous message" },
          { status: 409, headers: corsHeaders }
        )
      }

      // Update model if provided
      if (body.model) {
        msgSession.model = body.model as string
      }

      // Start a new query with resume to continue the conversation
      processQuery(msgSession, content, sessionId)

      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    // POST /api/sessions/:id/permission — resolve permission
    if (pathname.endsWith("/permission") && method === "POST") {
      if (!session) {
        return new Response("Session not found", { status: 404, headers: corsHeaders })
      }

      const body = await readBody(req)
      const requestId = body.requestId as string
      const allow = body.allow as boolean

      const resolver = session.pendingPermissions.get(requestId)
      if (!resolver) {
        return Response.json({ error: "No pending permission" }, { status: 404, headers: corsHeaders })
      }

      if (allow) {
        resolver({ behavior: "allow" })
      } else {
        resolver({ behavior: "deny", message: "User denied this action" })
      }
      session.pendingPermissions.delete(requestId)
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    // POST /api/sessions/:id/stop — stop processing
    if (pathname.endsWith("/stop") && method === "POST") {
      if (!session) {
        return new Response("Session not found", { status: 404, headers: corsHeaders })
      }
      console.log(`[STOP] sessionId=${sessionId} isProcessing=${session.isProcessing}`)
      // Abort the running query
      if (session.abortController) {
        session.abortController.abort()
        session.abortController = undefined
      }
      // Close all pending permissions with deny to unblock the query
      for (const [id, resolver] of session.pendingPermissions) {
        resolver({ behavior: "deny", message: "Session stopped by user" })
        session.pendingPermissions.delete(id)
      }
      session.isProcessing = false
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  },
})

console.log(`CC Shell backend running on http://localhost:${server.port}`)
