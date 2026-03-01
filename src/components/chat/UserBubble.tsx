import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MessageMenu } from "./MessageMenu"
import type { ChatMessage } from "@/types"

interface UserBubbleProps {
  message: ChatMessage
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function UserBubble({ message }: UserBubbleProps) {
  return (
    <div className="flex justify-end mb-4 px-4 group">
      <div className="flex items-start gap-1 max-w-[80%]">
        <div className="pt-1">
          <MessageMenu content={message.content} />
        </div>
        <div
          data-message-bubble
          data-raw-content={message.content}
          className="px-4 py-3 prose prose-sm dark:prose-invert"
          style={{
            backgroundColor: "var(--theme-userBubble)",
            color: "var(--theme-userText)",
            borderRadius: "var(--theme-radius)",
            borderBottomRightRadius: "4px",
          }}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          <div className="text-xs opacity-60 text-right mt-1 not-prose">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  )
}
