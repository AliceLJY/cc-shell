import { useState } from "react"
import { ShieldAlert, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PermissionRequest } from "@/types"

interface PermissionCardProps {
  request: PermissionRequest
  onRespond: (requestId: string, allow: boolean) => void
}

function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  if (toolName === "Bash" && input.command) return String(input.command)
  if (input.file_path) return String(input.file_path)
  if (input.path) return String(input.path)
  return JSON.stringify(input).slice(0, 200)
}

export function PermissionCard({ request, onRespond }: PermissionCardProps) {
  const [responded, setResponded] = useState<"allowed" | "denied" | null>(null)

  const handleRespond = (allow: boolean) => {
    setResponded(allow ? "allowed" : "denied")
    onRespond(request.requestId, allow)
  }

  if (responded) {
    return (
      <div className="flex justify-center mb-3 px-4">
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{
            color: responded === "allowed" ? "#22c55e" : "#ef4444",
            backgroundColor: "var(--theme-surface)",
            border: `1px solid ${responded === "allowed" ? "#22c55e33" : "#ef444433"}`,
          }}
        >
          {responded === "allowed" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {request.toolName} — {responded === "allowed" ? "Allowed" : "Denied"}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center mb-4 px-4">
      <div
        className="w-full max-w-[80%] rounded-lg p-4"
        style={{
          backgroundColor: "var(--theme-surface)",
          border: "2px solid #f59e0b44",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4" style={{ color: "#f59e0b" }} />
          <span className="text-sm font-medium" style={{ color: "var(--theme-aiText)" }}>
            Permission Required
          </span>
        </div>

        {/* Tool info */}
        <div
          className="text-xs mb-3 px-3 py-2 rounded font-mono"
          style={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-aiText)",
            border: "1px solid var(--theme-border)",
          }}
        >
          <span className="font-semibold">{request.toolName}</span>
          <div className="mt-1 truncate" style={{ color: "var(--theme-muted)" }}>
            {formatToolInput(request.toolName, request.toolInput)}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => handleRespond(true)}
            style={{ backgroundColor: "#22c55e", color: "#fff" }}
          >
            <Check className="h-3.5 w-3.5" />
            Allow
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => handleRespond(false)}
            style={{ borderColor: "#ef4444", color: "#ef4444" }}
          >
            <X className="h-3.5 w-3.5" />
            Deny
          </Button>
        </div>
      </div>
    </div>
  )
}
