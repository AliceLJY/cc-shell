import { useEffect, useRef, useCallback, useState } from "react"
import type { SSEEvent } from "@/types"

interface UseSSEOptions {
  sessionId: string | null
  onEvent: (event: SSEEvent) => void
}

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

export function useSSE({ sessionId, onEvent }: UseSSEOptions) {
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  const retriesRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  onEventRef.current = onEvent

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    retriesRef.current = 0
    setConnected(false)
  }, [])

  const connectSSE = useCallback((sid: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`/api/sessions/${sid}/stream`)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      eventSourceRef.current = null
      if (retriesRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current)
        retriesRef.current++
        retryTimerRef.current = setTimeout(() => connectSSE(sid), delay)
      }
    }

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
  }, [])

  useEffect(() => {
    if (!sessionId) {
      disconnect()
      return
    }
    connectSSE(sessionId)
    return () => disconnect()
  }, [sessionId, disconnect, connectSSE])

  return { connected, disconnect }
}
