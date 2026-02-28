import { query, listSessions } from "@anthropic-ai/claude-agent-sdk"
import type { Query } from "@anthropic-ai/claude-agent-sdk"

// Active sessions: sessionId -> { query, sseControllers, pendingPermissions }
interface ActiveSession {
  query: Query
  sseControllers: Set<ReadableStreamDefaultController>
  pendingPermissions: Map<string, (result: { behavior: "allow" | "deny" }) => void>
  abortController: AbortController
}

const activeSessions = new Map<string, ActiveSession>()

function sendSSE(session: ActiveSession, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const controller of session.sseControllers) {
    try {
      controller.enqueue(new TextEncoder().encode(payload))
    } catch {
      session.sseControllers.delete(controller)
    }
  }
}

async function startSessionLoop(sessionId: string, session: ActiveSession) {
  try {
    for await (const msg of session.query) {
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
              toolCalls,
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
          const resultMsg = msg as Record<string, unknown>
          sendSSE(session, "result", {
            type: "result",
            cost: resultMsg.total_cost_usd ?? 0,
            usage: resultMsg.usage ?? { inputTokens: 0, outputTokens: 0 },
            duration: resultMsg.duration_ms ?? 0,
          })
          break
        }

        case "system": {
          const sysMsg = msg as Record<string, unknown>
          sendSSE(session, "status", {
            type: "status",
            text: typeof sysMsg.message === "string" ? sysMsg.message : "system event",
          })
          break
        }

        default:
          break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    sendSSE(session, "error", { type: "error", message })
  }
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

const server = Bun.serve({
  port: 3001,
  fetch: async (req) => {
    const url = new URL(req.url)
    const { pathname } = url
    const method = req.method

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
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

    // POST /api/sessions — create new session
    if (pathname === "/api/sessions" && method === "POST") {
      const body = await readBody(req)
      const model = (body.model as string) || "claude-sonnet-4-6"
      const prompt = (body.prompt as string) || ""

      const abortController = new AbortController()
      const pendingPermissions = new Map<string, (result: { behavior: "allow" | "deny" }) => void>()

      const q = query({
        prompt: prompt || "Hello",
        options: {
          model,
          includePartialMessages: true,
          abortController,
          permissionMode: "default",
          canUseTool: async (toolName, input, opts) => {
            const requestId = opts.toolUseID
            return new Promise((resolve) => {
              // Store resolver so frontend can respond
              const sessionId = q.initializationResult().then((r) => r.sessionId).catch(() => "unknown")
              sessionId.then((sid) => {
                const session = activeSessions.get(sid)
                if (session) {
                  session.pendingPermissions.set(requestId, resolve as (result: { behavior: "allow" | "deny" }) => void)
                  sendSSE(session, "permission_request", {
                    type: "permission_request",
                    request: {
                      requestId,
                      toolName,
                      toolInput: input,
                      description: `${toolName}: ${JSON.stringify(input).slice(0, 200)}`,
                    },
                  })
                }
              })
            })
          },
        },
      })

      // Get session ID from initialization
      let sessionId: string
      try {
        const initResult = await q.initializationResult()
        sessionId = initResult.sessionId
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Failed to initialize session" },
          { status: 500, headers: corsHeaders }
        )
      }

      const session: ActiveSession = {
        query: q,
        sseControllers: new Set(),
        pendingPermissions,
        abortController,
      }
      activeSessions.set(sessionId, session)

      // Start processing loop in background
      startSessionLoop(sessionId, session)

      return Response.json({ sessionId, model }, { headers: corsHeaders })
    }

    // Routes with session ID
    const sessionId = extractSessionId(pathname)
    if (!sessionId) {
      return new Response("Not found", { status: 404, headers: corsHeaders })
    }

    // GET /api/sessions/:id/stream — SSE endpoint
    if (pathname === `/api/sessions/${sessionId}/stream` && method === "GET") {
      const session = activeSessions.get(sessionId)
      if (!session) {
        return new Response("Session not found", { status: 404, headers: corsHeaders })
      }

      const stream = new ReadableStream({
        start(controller) {
          session.sseControllers.add(controller)
          // Send init event
          const payload = `event: system_init\ndata: ${JSON.stringify({ type: "system_init", sessionId })}\n\n`
          controller.enqueue(new TextEncoder().encode(payload))
        },
        cancel() {
          // Client disconnected
          const session = activeSessions.get(sessionId)
          if (session) {
            // Controller will be cleaned up on next send attempt
          }
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

    // POST /api/sessions/:id/msg — send message
    if (pathname === `/api/sessions/${sessionId}/msg` && method === "POST") {
      const session = activeSessions.get(sessionId)
      if (!session) {
        return new Response("Session not found", { status: 404, headers: corsHeaders })
      }

      const body = await readBody(req)
      const content = body.content as string
      if (!content) {
        return Response.json({ error: "content required" }, { status: 400, headers: corsHeaders })
      }

      try {
        // Use streamInput to send follow-up messages
        async function* userMessage() {
          yield {
            type: "user" as const,
            message: { role: "user" as const, content },
            session_id: sessionId!,
            uuid: crypto.randomUUID(),
          }
        }
        await session.query.streamInput(userMessage())
        return Response.json({ ok: true }, { headers: corsHeaders })
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : "Failed to send message" },
          { status: 500, headers: corsHeaders }
        )
      }
    }

    // POST /api/sessions/:id/permission — resolve permission
    if (pathname === `/api/sessions/${sessionId}/permission` && method === "POST") {
      const session = activeSessions.get(sessionId)
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

      resolver({ behavior: allow ? "allow" : "deny" })
      session.pendingPermissions.delete(requestId)
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    // POST /api/sessions/:id/stop — stop session
    if (pathname === `/api/sessions/${sessionId}/stop` && method === "POST") {
      const session = activeSessions.get(sessionId)
      if (!session) {
        return new Response("Session not found", { status: 404, headers: corsHeaders })
      }

      try {
        session.query.close()
      } catch {
        // Already closed
      }
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    return new Response("Not found", { status: 404, headers: corsHeaders })
  },
})

console.log(`CC Shell backend running on http://localhost:${server.port}`)
