import { useReducer, useCallback, useState, useRef } from "react"
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

export function useSession(sessionId: string | null, onSessionCreated?: (id: string) => void) {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [model, setModel] = useState("claude-sonnet-4-6")
  const sessionIdRef = useRef(sessionId)
  sessionIdRef.current = sessionId

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
        break
      case "permission_request":
        dispatch({ type: "permission_request", request: event.request })
        break
      case "result":
        dispatch({ type: "result", usage: event.usage, cost: event.cost, duration: event.duration })
        break
      case "error":
        dispatch({ type: "stop_streaming" })
        break
    }
  }, [onSessionCreated])

  const { connected } = useSSE({ sessionId, onEvent: handleSSEEvent })

  const sendMessage = useCallback(
    async (content: string) => {
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
          // Follow-up message — send to existing session
          await api.sendMessage(sessionIdRef.current, content, model)
        }
      } catch (err) {
        console.error("Failed to send message:", err)
        dispatch({ type: "stop_streaming" })
      }
    },
    [model, onSessionCreated]
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
