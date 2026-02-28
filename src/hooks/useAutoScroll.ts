import { useRef, useEffect, useCallback, useState } from "react"

export function useAutoScroll(triggerValue: unknown) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setIsAtBottom(atBottom)
  }, [])

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom()
    }
  }, [triggerValue, isAtBottom, scrollToBottom])

  return { scrollRef, isAtBottom, scrollToBottom, handleScroll }
}
