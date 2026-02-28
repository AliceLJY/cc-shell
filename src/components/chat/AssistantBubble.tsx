import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import type { ChatMessage } from "@/types"

interface AssistantBubbleProps {
  message: ChatMessage
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
              // Block code — will be enhanced with CodeBlock in Task 8
              return (
                <div className="relative my-2 not-prose">
                  <div
                    className="text-xs px-3 py-1 font-mono"
                    style={{ color: "var(--theme-muted)", borderBottom: "1px solid var(--theme-border)" }}
                  >
                    {match[1]}
                  </div>
                  <pre
                    className="p-3 overflow-x-auto text-sm"
                    style={{
                      backgroundColor: "var(--theme-bg)",
                      borderRadius: "var(--theme-radius)",
                      border: "1px solid var(--theme-border)",
                    }}
                  >
                    <code style={{ color: "var(--theme-aiText)" }}>{children}</code>
                  </pre>
                </div>
              )
            },
          }}
        >
          {message.content}
        </Markdown>

        {/* Tool call placeholders */}
        {message.toolCalls?.map((tc) => (
          <div
            key={tc.id}
            className="mt-2 px-3 py-2 rounded text-xs not-prose"
            style={{
              backgroundColor: "var(--theme-surface)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-muted)",
            }}
          >
            {tc.name}: {JSON.stringify(tc.input).slice(0, 100)}
          </div>
        ))}

        <div className="text-xs opacity-60 text-right mt-1 not-prose">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
