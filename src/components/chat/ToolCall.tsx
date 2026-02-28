import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { CodeBlock } from "./CodeBlock"
import { DiffView } from "./DiffView"
import type { ToolCallInfo } from "@/types"

interface ToolCallProps {
  toolCall: ToolCallInfo
}

const TOOL_ICONS: Record<string, string> = {
  Read: "\u{1F4D6}",
  Edit: "\u{270F}\u{FE0F}",
  Write: "\u{1F4DD}",
  Bash: "\u{1F4BB}",
  Grep: "\u{1F50D}",
  Glob: "\u{1F4C1}",
  WebFetch: "\u{1F310}",
  WebSearch: "\u{1F310}",
}

function getPrimaryArg(toolCall: ToolCallInfo): string {
  const input = toolCall.input
  if (input.command) return String(input.command).slice(0, 80)
  if (input.file_path) return String(input.file_path)
  if (input.path) return String(input.path)
  if (input.pattern) return String(input.pattern)
  if (input.url) return String(input.url)
  if (input.query) return String(input.query)
  return JSON.stringify(input).slice(0, 60)
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || ""
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", rb: "ruby", java: "java",
    css: "css", html: "html", json: "json", md: "markdown", yaml: "yaml",
    yml: "yaml", toml: "toml", sh: "bash", zsh: "bash", sql: "sql",
  }
  return map[ext] || "text"
}

function renderExpandedContent(toolCall: ToolCallInfo) {
  const { name, input, output } = toolCall

  // Edit tool — show diff
  if (name === "Edit" && input.old_string && input.new_string) {
    return (
      <DiffView
        oldValue={String(input.old_string)}
        newValue={String(input.new_string)}
        fileName={input.file_path ? String(input.file_path) : undefined}
      />
    )
  }

  // Bash — show command + output separately
  if (name === "Bash") {
    return (
      <div className="space-y-2">
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--theme-muted)" }}>Command</div>
          <CodeBlock code={String(input.command || "")} language="bash" />
        </div>
        {output && (
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--theme-muted)" }}>Output</div>
            <CodeBlock code={output} language="text" />
          </div>
        )}
      </div>
    )
  }

  // Read — show file content with syntax highlighting
  if (name === "Read" && output) {
    const filePath = String(input.file_path || input.path || "")
    const lang = detectLanguage(filePath)
    return <CodeBlock code={output} language={lang} />
  }

  // Grep/Glob — show output as text
  if ((name === "Grep" || name === "Glob") && output) {
    return <CodeBlock code={output} language="text" />
  }

  // Default — show raw input as JSON + output
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-medium mb-1" style={{ color: "var(--theme-muted)" }}>Input</div>
        <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
      </div>
      {output && (
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: "var(--theme-muted)" }}>Output</div>
          <CodeBlock code={output} language="text" />
        </div>
      )}
    </div>
  )
}

export function ToolCall({ toolCall }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false)
  const icon = TOOL_ICONS[toolCall.name] || "\u{1F527}"

  return (
    <div
      className="my-2 rounded-lg overflow-hidden not-prose text-sm"
      style={{ border: "1px solid var(--theme-border)" }}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ backgroundColor: "var(--theme-surface)", color: "var(--theme-aiText)" }}
      >
        <span>{icon}</span>
        <span className="font-medium">{toolCall.name}</span>
        <span
          className="flex-1 truncate text-xs font-mono"
          style={{ color: "var(--theme-muted)" }}
        >
          {getPrimaryArg(toolCall)}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--theme-muted)" }} />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--theme-muted)" }} />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 py-2" style={{ backgroundColor: "var(--theme-bg)" }}>
          {renderExpandedContent(toolCall)}
        </div>
      )}
    </div>
  )
}
