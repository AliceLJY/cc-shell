import { useState, useRef, useEffect, useCallback } from "react"
import { Plus, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SessionInfo } from "@/types"

interface SidebarProps {
  sessions: SessionInfo[]
  activeSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
  loading?: boolean
}

const RENAME_KEY_PREFIX = "cc-shell-session-name-"

function getCustomName(sessionId: string): string | null {
  try {
    return localStorage.getItem(RENAME_KEY_PREFIX + sessionId)
  } catch {
    return null
  }
}

function setCustomName(sessionId: string, name: string) {
  try {
    localStorage.setItem(RENAME_KEY_PREFIX + sessionId, name)
  } catch {
    // localStorage may be full or unavailable
  }
}

function getDisplayName(session: SessionInfo): string {
  const custom = getCustomName(session.sessionId)
  if (custom) return custom
  return (session.summary || session.firstPrompt || "Untitled").slice(0, 30)
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

function SkeletonList() {
  return (
    <div className="px-2 space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-2 py-2 space-y-1.5">
          <div
            className="h-3.5 rounded animate-pulse"
            style={{ backgroundColor: "var(--theme-border)", width: `${60 + i * 8}%` }}
          />
          <div
            className="h-2.5 rounded animate-pulse"
            style={{ backgroundColor: "var(--theme-border)", width: "40%" }}
          />
        </div>
      ))}
    </div>
  )
}

// --- Inline editable session name ---

interface SessionItemProps {
  session: SessionInfo
  isActive: boolean
  onSelect: () => void
}

function SessionItem({ session, isActive, onSelect }: SessionItemProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const displayName = getDisplayName(session)

  const startEditing = useCallback(() => {
    setEditValue(displayName)
    setEditing(true)
  }, [displayName])

  const saveEdit = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== displayName) {
      setCustomName(session.sessionId, trimmed)
    }
    // If empty, don't save (revert to original)
    setEditing(false)
  }, [editValue, displayName, session.sessionId])

  const cancelEdit = useCallback(() => {
    setEditing(false)
  }, [])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  return (
    <button
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.preventDefault()
        startEditing()
      }}
      className="w-full text-left px-2 py-2 rounded-md text-sm truncate block transition-colors"
      style={{
        backgroundColor: isActive ? "var(--theme-accent)" + "22" : "transparent",
        color: isActive ? "var(--theme-accent)" : "var(--theme-aiText)",
        borderLeft: isActive ? `3px solid var(--theme-accent)` : "3px solid transparent",
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="w-full text-sm rounded px-1 py-0.5 outline-none"
          style={{
            backgroundColor: "var(--theme-input)",
            border: "1px solid var(--theme-border)",
            color: "var(--theme-aiText)",
          }}
        />
      ) : (
        <div className="truncate">{displayName}</div>
      )}
      <div className="text-xs mt-0.5" style={{ color: "var(--theme-muted)" }}>
        {formatRelativeTime(session.lastModified)}
      </div>
    </button>
  )
}

// --- Main Sidebar ---

export function Sidebar({ sessions, activeSessionId, onNewSession, onSelectSession, loading }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter sessions by search query (case-insensitive, match summary or firstPrompt or custom name)
  const filteredSessions = searchQuery.trim()
    ? sessions.filter((s) => {
        const q = searchQuery.toLowerCase()
        const custom = getCustomName(s.sessionId)
        const summary = s.summary?.toLowerCase() || ""
        const firstPrompt = s.firstPrompt?.toLowerCase() || ""
        const customLower = custom?.toLowerCase() || ""
        return summary.includes(q) || firstPrompt.includes(q) || customLower.includes(q)
      })
    : sessions

  const groups = groupSessions(filteredSessions)

  return (
    <div className="flex flex-col h-full">
      {/* New chat button */}
      <div className="p-3 pb-2">
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

      {/* Search box */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
            style={{ color: "var(--theme-muted)" }}
          />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm rounded-md pl-7 pr-7 py-1.5 outline-none transition-colors"
            style={{
              backgroundColor: "var(--theme-input)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-aiText)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 transition-colors hover:opacity-80"
              style={{ color: "var(--theme-muted)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1 px-2">
        {loading ? (
          <SkeletonList />
        ) : groups.length === 0 ? (
          <div className="text-center text-xs py-8" style={{ color: "var(--theme-muted)" }}>
            {searchQuery.trim() ? "No matching sessions" : "No sessions yet"}
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <div
                className="text-xs font-medium px-2 py-1 uppercase tracking-wider"
                style={{ color: "var(--theme-muted)" }}
              >
                {group.label}
              </div>
              {group.items.map((session) => (
                <SessionItem
                  key={session.sessionId}
                  session={session}
                  isActive={session.sessionId === activeSessionId}
                  onSelect={() => onSelectSession(session.sessionId)}
                />
              ))}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  )
}
