import { useState, useEffect, type ReactNode } from "react"
import { PanelLeftClose, PanelLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppShellProps {
  sidebar: ReactNode
  topBar: ReactNode
  children: ReactNode
  statusBar: ReactNode
}

const SIDEBAR_WIDTH_KEY = "cc-shell-sidebar-width"

export function AppShell({ sidebar, topBar, children, statusBar }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    return stored ? parseInt(stored) : 280
  })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Hide sidebar by default on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div
      className="h-screen flex overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: "var(--theme-bg)", fontFamily: "var(--theme-font)" }}
    >
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`flex-shrink-0 flex flex-col transition-all duration-200 overflow-hidden ${
          isMobile ? "fixed left-0 top-0 bottom-0 z-40" : ""
        }`}
        style={{
          width: sidebarOpen ? sidebarWidth : 0,
          backgroundColor: "var(--theme-sidebar)",
          borderRight: sidebarOpen ? "1px solid var(--theme-border)" : "none",
        }}
      >
        {sidebar}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <div
          className="flex items-center h-12 px-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--theme-border)", backgroundColor: "var(--theme-surface)" }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ color: "var(--theme-muted)" }}
          >
            {isMobile ? (
              <Menu className="h-4 w-4" />
            ) : sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          {topBar}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden">{children}</div>

        {/* Status bar */}
        <div
          className="h-8 flex items-center px-4 text-xs flex-shrink-0"
          style={{
            borderTop: "1px solid var(--theme-border)",
            backgroundColor: "var(--theme-surface)",
            color: "var(--theme-muted)",
          }}
        >
          {statusBar}
        </div>
      </div>
    </div>
  )
}
