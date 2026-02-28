import { Children, isValidElement } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { CodeBlock } from "./CodeBlock"
import { ToolCall } from "./ToolCall"
import type { ChatMessage } from "@/types"

interface AssistantBubbleProps {
  message: ChatMessage
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function extractText(children: React.ReactNode): string {
  const parts: string[] = []
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      parts.push(child)
    } else if (isValidElement(child) && child.props?.children) {
      parts.push(extractText(child.props.children))
    }
  })
  return parts.join("")
}

export function AssistantBubble({ message }: AssistantBubbleProps) {
  return (
    <div className="flex justify-start mb-4 px-4">
      <div
        className="max-w-[80%] px-4 py-3 prose prose-sm dark:prose-invert max-w-none"
        style={{
          backgroundColor: "var(--theme-aiBubble)",
          color: "var(--theme-aiText)",
          borderRadius: "var(--theme-radius)",
          borderBottomLeftRadius: "4px",
        }}
      >
        <Markdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "")
              const isInline = !match
              if (isInline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded text-sm"
                    style={{
                      backgroundColor: "var(--theme-surface)",
                      color: "var(--theme-accent)",
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                )
              }
              const codeStr = extractText(children)
              return (
                <div className="not-prose">
                  <CodeBlock code={codeStr} language={match[1]} />
                </div>
              )
            },
          }}
        >
          {message.content}
        </Markdown>

        {/* Tool call cards */}
        {message.toolCalls?.map((tc) => (
          <div key={tc.id} className="not-prose">
            <ToolCall toolCall={tc} />
          </div>
        ))}

        <div className="text-xs opacity-60 text-right mt-1 not-prose">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
