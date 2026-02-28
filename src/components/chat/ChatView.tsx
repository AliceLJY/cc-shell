import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import type { ChatMessage, PermissionRequest } from "@/types"

interface ChatViewProps {
  messages: ChatMessage[]
  streamingText: string
  isStreaming: boolean
  model: string
  onModelChange: (model: string) => void
  onSend: (content: string) => void
  onStop: () => void
  pendingPermissions: PermissionRequest[]
  onRespondPermission: (requestId: string, allow: boolean) => void
}

export function ChatView({
  messages,
  streamingText,
  isStreaming,
  model,
  onModelChange,
  onSend,
  onStop,
  pendingPermissions,
  onRespondPermission,
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
        pendingPermissions={pendingPermissions}
        onRespondPermission={onRespondPermission}
      />
      <MessageInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        model={model}
        onModelChange={onModelChange}
      />
    </div>
  )
}
