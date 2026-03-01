import { useState, useRef, useCallback, type KeyboardEvent } from "react"
import { ArrowUp, Square, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MessageInputProps {
  onSend: (content: string) => void
  onStop: () => void
  isStreaming: boolean
  model: string
  onModelChange: (model: string) => void
}

const MODELS = [
  { id: "claude-opus-4-6", label: "Opus", color: "#a855f7" },
  { id: "claude-sonnet-4-6", label: "Sonnet", color: "#3b82f6" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku", color: "#22c55e" },
]

export function MessageInput({ onSend, onStop, isStreaming, model, onModelChange }: MessageInputProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[1]

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [text, isStreaming, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault()
      onStop()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const maxHeight = 6 * 24 // ~6 lines
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px"
  }

  return (
    <div
      style={{ borderTop: "1px solid var(--theme-border)", backgroundColor: "var(--theme-surface)" }}
    >
      <div className="flex items-end gap-2 px-3 pt-3 pb-1">
        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 h-8 shrink-0"
              style={{ color: "var(--theme-muted)" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentModel.color }}
              />
              <span className="text-xs">{currentModel.label}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            style={{
              backgroundColor: "var(--theme-surface)",
              borderColor: "var(--theme-border)",
            }}
          >
            {MODELS.map((m) => (
              <DropdownMenuItem
                key={m.id}
                onClick={() => onModelChange(m.id)}
                className="gap-2"
                style={{ color: "var(--theme-aiText)" }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                {m.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Send a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm py-2 px-3 rounded-lg"
          style={{
            backgroundColor: "var(--theme-input)",
            color: "var(--theme-aiText)",
            border: "1px solid var(--theme-border)",
            maxHeight: "144px",
          }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onStop}
            style={{ color: "var(--theme-accent)" }}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={!text.trim()}
            style={{ color: text.trim() ? "var(--theme-accent)" : "var(--theme-muted)" }}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      <div
        className="text-right px-3 pb-2"
        style={{ color: "var(--theme-muted)", fontSize: "11px" }}
      >
        &#x2318;&#x21B5; send &middot; Esc stop
      </div>
    </div>
  )
}
