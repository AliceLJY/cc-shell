import { UserBubble } from "./UserBubble"
import { AssistantBubble } from "./AssistantBubble"
import { SystemMessage } from "./SystemMessage"
import { PermissionCard } from "./PermissionCard"
import { useAutoScroll } from "@/hooks/useAutoScroll"
import type { ChatMessage, PermissionRequest } from "@/types"

interface MessageListProps {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
  pendingPermissions: PermissionRequest[]
  onRespondPermission: (requestId: string, allow: boolean) => void
}

export function MessageList({ messages, streamingText, isStreaming, pendingPermissions, onRespondPermission }: MessageListProps) {
  const { scrollRef, handleScroll } = useAutoScroll([messages, streamingText, pendingPermissions])

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-4"
    >
      {messages.map((msg) => {
        switch (msg.role) {
          case "user":
            return <UserBubble key={msg.id} message={msg} />
          case "assistant":
            return <AssistantBubble key={msg.id} message={msg} />
          case "system":
            return <SystemMessage key={msg.id} text={msg.content} />
          default:
            return null
        }
      })}

      {/* Permission cards */}
      {pendingPermissions.map((req) => (
        <PermissionCard
          key={req.requestId}
          request={req}
          onRespond={onRespondPermission}
        />
      ))}

      {/* Streaming indicator */}
      {isStreaming && streamingText && (
        <AssistantBubble
          message={{
            id: "streaming",
            role: "assistant",
            content: streamingText,
            timestamp: Date.now(),
          }}
        />
      )}

      {isStreaming && !streamingText && (
        <div className="flex justify-start mb-4 px-4">
          <div
            className="px-4 py-3 rounded-lg"
            style={{ backgroundColor: "var(--theme-aiBubble)" }}
          >
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--theme-accent)", animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--theme-accent)", animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--theme-accent)", animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
