import { useState, useCallback } from "react"
import { Check, Copy } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"
import { ShikiHighlighter } from "react-shiki"

interface CodeBlockProps {
  code: string
  language?: string
}

export function CodeBlock({ code, language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  const isDark = theme.category === "暗色系"

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div
      className="group/code relative my-2 rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--theme-border)" }}
    >
      {/* Header: language label + copy button */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 text-xs select-none"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderBottom: "1px solid var(--theme-border)",
          color: "var(--theme-muted)",
        }}
      >
        <span className="font-mono lowercase">{language}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200"
          style={{
            color: copied ? "var(--theme-accent)" : "var(--theme-muted)",
            opacity: copied ? 1 : undefined,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.backgroundColor = isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 opacity-60 group-hover/code:opacity-100 transition-opacity duration-200" />
              <span className="text-xs opacity-0 group-hover/code:opacity-60 transition-opacity duration-200">
                复制
              </span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div
        className="max-h-[400px] overflow-auto text-sm"
        style={{ backgroundColor: "var(--theme-bg)" }}
      >
        <ShikiHighlighter
          language={language}
          theme={isDark ? "github-dark" : "github-light"}
        >
          {code}
        </ShikiHighlighter>
      </div>
    </div>
  )
}
