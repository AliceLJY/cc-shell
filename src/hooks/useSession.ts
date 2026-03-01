import { useReducer, useCallback, useState, useRef, useEffect } from "react"
import { useSSE } from "./useSSE"
import * as api from "@/lib/api"
import type { ChatMessage, SSEEvent, TokenUsage, PermissionRequest } from "@/types"

interface SessionState {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
  usage: TokenUsage
  cost: number
  duration: number
  pendingPermissions: PermissionRequest[]
}

type SessionAction =
  | { type: "add_user_message"; message: ChatMessage }
  | { type: "text_delta"; text: string }
  | { type: "assistant_message"; message: ChatMessage }
  | { type: "start_streaming" }
  | { type: "stop_streaming" }
  | { type: "result"; usage: TokenUsage; cost: number; duration: number }
  | { type: "permission_request"; request: PermissionRequest }
  | { type: "permission_resolved"; requestId: string }
  | { type: "load_messages"; messages: ChatMessage[] }
  | { type: "clear" }

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "add_user_message":
      return { ...state, messages: [...state.messages, action.message], streamingText: "", isStreaming: true }
    case "text_delta":
      return { ...state, streamingText: state.streamingText + action.text, isStreaming: true }
    case "assistant_message":
      return {
        ...state,
        messages: [...state.messages, action.message],
        streamingText: "",
        isStreaming: false,
      }
    case "start_streaming":
      return { ...state, isStreaming: true, streamingText: "" }
    case "stop_streaming":
      return { ...state, isStreaming: false }
    case "result":
      return {
        ...state,
        usage: {
          inputTokens: state.usage.inputTokens + (action.usage.inputTokens || 0),
          outputTokens: state.usage.outputTokens + (action.usage.outputTokens || 0),
        },
        cost: state.cost + action.cost,
        duration: action.duration,
        isStreaming: false,
      }
    case "permission_request":
      return { ...state, pendingPermissions: [...state.pendingPermissions, action.request] }
    case "permission_resolved":
      return {
        ...state,
        pendingPermissions: state.pendingPermissions.filter((p) => p.requestId !== action.requestId),
      }
    case "load_messages":
      return { ...state, messages: action.messages }
    case "clear":
      return initialState
    default:
      return state
  }
}

const initialState: SessionState = {
  messages: [],
  streamingText: "",
  isStreaming: false,
  usage: { inputTokens: 0, outputTokens: 0 },
  cost: 0,
  duration: 0,
  pendingPermissions: [],
}

interface UseSessionCallbacks {
  onSessionCreated?: (id: string) => void
  onQueryComplete?: () => void
}

export function useSession(sessionId: string | null, cwd: string | undefined, callbacks?: UseSessionCallbacks) {
  const onSessionCreated = callbacks?.onSessionCreated
  const onQueryComplete = callbacks?.onQueryComplete
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [model, setModel] = useState("claude-sonnet-4-6")
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

  // Browser notification support
  const notificationPermissionRef = useRef<NotificationPermission>("default")
  const queryStartTimeRef = useRef<number | null>(null)
  const lastAssistantTextRef = useRef<string>("")

  // Request notification permission once on mount
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        notificationPermissionRef.current = perm
      }).catch(() => {
        // User denied or browser blocked — silently ignore
      })
    } else if (typeof Notification !== "undefined") {
      notificationPermissionRef.current = Notification.permission
    }
  }, [])

  // Load historical messages when switching to a session
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    api.fetchMessages(sessionId).then((msgs) => {
      if (!cancelled && msgs.length > 0) {
        dispatch({ type: "load_messages", messages: msgs })
      }
    }).catch(() => {
      // Session may not have messages yet (new session)
    })
    return () => { cancelled = true }
  }, [sessionId])

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "system_init": {
        // Update session ID to the real SDK session ID
        const realId = (event as unknown as { sessionId: string }).sessionId
        if (realId && realId !== sessionIdRef.current) {
          sessionIdRef.current = realId
          onSessionCreated?.(realId)
        }
        break
      }
      case "text_delta":
        dispatch({ type: "text_delta", text: event.text })
        break
      case "assistant_message":
        dispatch({ type: "assistant_message", message: event.message })
        // Capture latest assistant text for notification preview
        if (typeof event.message.content === "string") {
          lastAssistantTextRef.current = event.message.content
        }
        break
      case "permission_request":
        dispatch({ type: "permission_request", request: event.request })
        break
      case "result": {
        dispatch({ type: "result", usage: event.usage, cost: event.cost, duration: event.duration })
        onQueryComplete?.()

        // Browser notification when tab is not visible and query took > 5s
        const elapsed = queryStartTimeRef.current ? Date.now() - queryStartTimeRef.current : 0
        queryStartTimeRef.current = null
        if (
          elapsed > 5000 &&
          typeof document !== "undefined" && document.hidden &&
          typeof Notification !== "undefined" && notificationPermissionRef.current === "granted"
        ) {
          const preview = lastAssistantTextRef.current.slice(0, 50)
          const body = preview ? `查询已完成: ${preview}${lastAssistantTextRef.current.length > 50 ? "..." : ""}` : "查询已完成"
          const notification = new Notification("CC Shell", { body })
          notification.onclick = () => {
            window.focus()
            notification.close()
          }
        }
        break
      }
      case "error":
        dispatch({ type: "stop_streaming" })
        break
    }
  }, [onSessionCreated, onQueryComplete])

  const { connected } = useSSE({ sessionId, onEvent: handleSSEEvent })

  const sendMessage = useCallback(
    async (content: string) => {
      queryStartTimeRef.current = Date.now()
      lastAssistantTextRef.current = ""
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      }
      dispatch({ type: "add_user_message", message: userMsg })

      try {
        if (!sessionIdRef.current) {
          // First message — create session
          const { sessionId: newId } = await api.createSession(model, content)
          onSessionCreated?.(newId)
        } else {
          // Follow-up message — send to existing session (pass cwd for cross-project resume)
          await api.sendMessage(sessionIdRef.current, content, model, cwd)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error"
        console.error("Failed to send message:", errMsg)
        // Show error as a system message so user knows what happened
        dispatch({
          type: "assistant_message",
          message: {
            id: crypto.randomUUID(),
            role: "system" as const,
            content: errMsg.includes("busy") ? "⚠️ 上一条消息还在处理中，请稍后再试" : `⚠️ 发送失败: ${errMsg}`,
            timestamp: Date.now(),
          },
        })
        dispatch({ type: "stop_streaming" })
      }
    },
    [model, cwd, onSessionCreated]
  )

  const respondPermission = useCallback(
    async (requestId: string, allow: boolean) => {
      if (!sessionIdRef.current) return
      try {
        await api.respondPermission(sessionIdRef.current, requestId, allow)
        dispatch({ type: "permission_resolved", requestId })
      } catch (err) {
        console.error("Failed to respond to permission:", err)
      }
    },
    []
  )

  const stop = useCallback(async () => {
    if (!sessionIdRef.current) return
    try {
      await api.stopSession(sessionIdRef.current)
    } catch (err) {
      console.error("Failed to stop session:", err)
    }
    dispatch({ type: "stop_streaming" })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: "clear" })
  }, [])

  return {
    ...state,
    connected,
    model,
    setModel,
    sendMessage,
    respondPermission,
    stop,
    clear,
  }
}
