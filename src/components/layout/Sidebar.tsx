import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SessionInfo } from "@/types"

interface SidebarProps {
  sessions: SessionInfo[]
  activeSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function groupSessions(sessions: SessionInfo[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000

  const groups: { label: string; items: SessionInfo[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier", items: [] },
  ]

  for (const s of sessions) {
    if (s.lastModified >= today) groups[0].items.push(s)
    else if (s.lastModified >= yesterday) groups[1].items.push(s)
    else groups[2].items.push(s)
  }

  return groups.filter((g) => g.items.length > 0)
}

export function Sidebar({ sessions, activeSessionId, onNewSession, onSelectSession }: SidebarProps) {
  const groups = groupSessions(sessions)

  return (
    <div className="flex flex-col h-full">
      {/* New chat button */}
      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={onNewSession}
          style={{
            borderColor: "var(--theme-border)",
            color: "var(--theme-aiText)",
            backgroundColor: "transparent",
          }}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1 px-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div
              className="text-xs font-medium px-2 py-1 uppercase tracking-wider"
              style={{ color: "var(--theme-muted)" }}
            >
              {group.label}
            </div>
            {group.items.map((session) => {
              const isActive = session.sessionId === activeSessionId
              return (
                <button
                  key={session.sessionId}
                  onClick={() => onSelectSession(session.sessionId)}
                  className="w-full text-left px-2 py-2 rounded-md text-sm truncate block transition-colors"
                  style={{
                    backgroundColor: isActive ? "var(--theme-accent)" + "22" : "transparent",
                    color: isActive ? "var(--theme-accent)" : "var(--theme-aiText)",
                    borderLeft: isActive ? `3px solid var(--theme-accent)` : "3px solid transparent",
                  }}
                >
                  <div className="truncate">
                    {(session.firstPrompt || session.summary || "Untitled").slice(0, 30)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--theme-muted)" }}>
                    {formatRelativeTime(session.lastModified)}
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </ScrollArea>
    </div>
  )
}
