import { useState, useCallback, useEffect } from "react"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { AppShell } from "@/components/layout/AppShell"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { StatusBar } from "@/components/layout/StatusBar"
import { ThemePicker } from "@/components/theme/ThemePicker"
import { ChatView } from "@/components/chat/ChatView"
import { useSession } from "@/hooks/useSession"
import { loadThemeState, saveThemeState, rotateTheme } from "@/lib/theme-rotation"
import * as api from "@/lib/api"
import type { Theme, ThemeState, SessionInfo } from "@/types"
import themeCatalog from "../themes/theme-catalog.json"

const themes = themeCatalog as Theme[]

function App() {
  const [themeState, setThemeState] = useState<ThemeState>(loadThemeState)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  // "pending" = user clicked New Chat but hasn't sent first message yet
  const [pendingNewChat, setPendingNewChat] = useState(false)

  const refreshSessions = useCallback(() => {
    api.fetchSessions().then(setSessions).catch(() => {})
  }, [])

  const handleSessionCreated = useCallback((newId: string) => {
    setActiveSessionId(newId)
    setPendingNewChat(false)
  }, [])

  // Find the cwd for the active session (needed for cross-project resume)
  const activeSessionCwd = sessions.find((s) => s.sessionId === activeSessionId)?.cwd
  const session = useSession(activeSessionId, activeSessionCwd, {
    onSessionCreated: handleSessionCreated,
    onQueryComplete: refreshSessions,
  })
  const currentTheme = themes.find((t) => t.id === themeState.currentThemeId) || themes[0]

  // Load sessions on mount
  useEffect(() => {
    setSessionsLoading(true)
    api.fetchSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false))
  }, [])

  const handleSetTheme = useCallback((id: number) => {
    const newState = { ...themeState, currentThemeId: id }
    saveThemeState(newState)
    setThemeState(newState)
  }, [themeState])

  const handleToggleLock = useCallback(() => {
    const newState = { ...themeState, locked: !themeState.locked }
    saveThemeState(newState)
    setThemeState(newState)
  }, [themeState])

  const handleRotate = useCallback(() => {
    const newState = rotateTheme(themes, themeState)
    setThemeState(newState)
  }, [themeState])

  const handleNewSession = useCallback(() => {
    session.clear()
    setActiveSessionId(null)
    setPendingNewChat(true)
    handleRotate()
  }, [session.clear, handleRotate])

  const handleSwitchSession = useCallback((id: string) => {
    session.clear()
    setPendingNewChat(false)
    setActiveSessionId(id)
  }, [session.clear])

  const showChat = activeSessionId !== null || pendingNewChat

  return (
    <ThemeProvider
      theme={currentTheme}
      themes={themes}
      locked={themeState.locked}
      setTheme={handleSetTheme}
      toggleLock={handleToggleLock}
      rotate={handleRotate}
    >
      <AppShell
        sidebar={
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewSession={handleNewSession}
            onSelectSession={handleSwitchSession}
            loading={sessionsLoading}
          />
        }
        topBar={
          <TopBar
            onOpenThemePicker={() => setThemePickerOpen(true)}
            themeName={currentTheme.name}
          />
        }
        statusBar={
          <StatusBar
            inputTokens={session.usage.inputTokens}
            outputTokens={session.usage.outputTokens}
            cost={session.cost}
            connected={session.connected}
          />
        }
      >
        {showChat ? (
          <ChatView
            messages={session.messages}
            streamingText={session.streamingText}
            isStreaming={session.isStreaming}
            model={session.model}
            onModelChange={session.setModel}
            onSend={session.sendMessage}
            onStop={session.stop}
            pendingPermissions={session.pendingPermissions}
            onRespondPermission={session.respondPermission}
          />
        ) : (
          <div
            className="h-full flex items-center justify-center"
            style={{ color: "var(--theme-muted)" }}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <div className="text-lg font-medium">Start a new chat!</div>
              <div className="text-sm mt-1">Click "New Chat" to begin</div>
            </div>
          </div>
        )}
      </AppShell>
      <ThemePicker open={themePickerOpen} onOpenChange={setThemePickerOpen} />
    </ThemeProvider>
  )
}

export default App
