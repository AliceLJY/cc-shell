import { useState, useCallback } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
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
      className="relative my-2 rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--theme-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderBottom: "1px solid var(--theme-border)",
          color: "var(--theme-muted)",
        }}
      >
        <span className="font-mono">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          style={{ color: "var(--theme-muted)" }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>

      {/* Code */}
      <div className="max-h-[400px] overflow-auto text-sm" style={{ backgroundColor: "var(--theme-bg)" }}>
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
