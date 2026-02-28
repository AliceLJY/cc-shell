import { useState } from "react"
import { MoreHorizontal, Copy, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MessageMenuProps {
  content: string
}

export function MessageMenu({ content }: MessageMenuProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--theme-muted)" }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
        }}
      >
        <DropdownMenuItem
          onClick={handleCopy}
          className="gap-2 text-xs"
          style={{ color: "var(--theme-aiText)" }}
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied!" : "Copy message"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCopyMarkdown}
          className="gap-2 text-xs"
          style={{ color: "var(--theme-aiText)" }}
        >
          <FileText className="h-3 w-3" />
          Copy as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
