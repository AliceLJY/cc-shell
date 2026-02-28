import { Info } from "lucide-react"

interface SystemMessageProps {
  text: string
}

export function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="flex justify-center mb-3 px-4">
      <div
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
        style={{ color: "var(--theme-muted)", backgroundColor: "var(--theme-surface)" }}
      >
        <Info className="h-3 w-3" />
        {text}
      </div>
    </div>
  )
}
