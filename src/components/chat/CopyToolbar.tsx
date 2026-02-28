import { useEffect, useState, useCallback, useRef } from "react"
import { Copy, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyToolbar() {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState("")
  const toolbarRef = useRef<HTMLDivElement>(null)

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setVisible(false)
      return
    }

    // Check if selection is within a message bubble
    const anchorNode = selection.anchorNode
    const bubble = anchorNode?.parentElement?.closest("[data-message-bubble]")
    if (!bubble) {
      setVisible(false)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setPosition({
      top: rect.top - 40,
      left: rect.left + rect.width / 2 - 60,
    })
    setSelectedText(selection.toString())
    setVisible(true)
  }, [])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => document.removeEventListener("selectionchange", handleSelectionChange)
  }, [handleSelectionChange])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(selectedText)
    setVisible(false)
    window.getSelection()?.removeAllRanges()
  }, [selectedText])

  const handleCopyMarkdown = useCallback(() => {
    // Get the raw markdown from data attribute if available
    const selection = window.getSelection()
    const anchorNode = selection?.anchorNode
    const bubble = anchorNode?.parentElement?.closest("[data-message-bubble]")
    const rawMd = bubble?.getAttribute("data-raw-content") || selectedText
    navigator.clipboard.writeText(rawMd)
    setVisible(false)
    window.getSelection()?.removeAllRanges()
  }, [selectedText])

  if (!visible) return null

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-1 px-1.5 py-1 rounded-lg shadow-lg transition-opacity"
      style={{
        top: position.top,
        left: position.left,
        backgroundColor: "var(--theme-surface)",
        border: "1px solid var(--theme-border)",
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={handleCopy}
        style={{ color: "var(--theme-aiText)" }}
      >
        <Copy className="h-3 w-3" />
        Copy
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={handleCopyMarkdown}
        style={{ color: "var(--theme-aiText)" }}
      >
        <FileText className="h-3 w-3" />
        Markdown
      </Button>
    </div>
  )
}
