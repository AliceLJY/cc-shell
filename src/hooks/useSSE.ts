import { useEffect, useRef, useCallback, useState } from "react"
import type { SSEEvent } from "@/types"

interface UseSSEOptions {
  sessionId: string | null
  onEvent: (event: SSEEvent) => void
}

export function useSSE({ sessionId, onEvent }: UseSSEOptions) {
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnected(false)
  }, [])

  useEffect(() => {
    if (!sessionId) {
      disconnect()
      return
    }

    const es = new EventSource(`/api/sessions/${sessionId}/stream`)
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    const eventTypes = [
      "system_init",
      "text_delta",
      "assistant_message",
      "tool_call",
      "permission_request",
      "result",
      "error",
      "status",
    ]

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          onEventRef.current(data as SSEEvent)
        } catch {
          // Ignore parse errors
        }
      })
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [sessionId, disconnect])

  return { connected, disconnect }
}
