import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"

interface ChatViewProps {
  messages: import("@/types").ChatMessage[]
  streamingText: string
  isStreaming: boolean
  model: string
  onModelChange: (model: string) => void
  onSend: (content: string) => void
  onStop: () => void
}

export function ChatView({
  messages,
  streamingText,
  isStreaming,
  model,
  onModelChange,
  onSend,
  onStop,
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        streamingText={streamingText}
        isStreaming={isStreaming}
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
