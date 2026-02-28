import { createContext, useEffect, type ReactNode } from "react"
import type { Theme } from "@/types"

export const ThemeContext = createContext<{
  theme: Theme
  themes: Theme[]
  locked: boolean
  setTheme: (id: number) => void
  toggleLock: () => void
  rotate: () => void
} | null>(null)

function applyThemeCSS(theme: Theme) {
  const root = document.documentElement
  const isDark = theme.category === "暗色系"

  // Set theme-specific CSS variables
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--theme-${key}`, value)
  }
  root.style.setProperty("--theme-font", theme.font)
  root.style.setProperty("--theme-radius", theme.borderRadius)
  root.setAttribute("data-theme-category", theme.category)

  // Toggle .dark class for shadcn + Tailwind dark: variant
  if (isDark) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }

  // Bridge theme colors to shadcn CSS variables so dialogs/dropdowns match
  root.style.setProperty("--background", theme.colors.bg)
  root.style.setProperty("--foreground", theme.colors.aiText)
  root.style.setProperty("--card", theme.colors.surface)
  root.style.setProperty("--card-foreground", theme.colors.aiText)
  root.style.setProperty("--popover", theme.colors.surface)
  root.style.setProperty("--popover-foreground", theme.colors.aiText)
  root.style.setProperty("--primary", theme.colors.accent)
  root.style.setProperty("--primary-foreground", theme.colors.bg)
  root.style.setProperty("--secondary", theme.colors.surface)
  root.style.setProperty("--secondary-foreground", theme.colors.aiText)
  root.style.setProperty("--muted", theme.colors.surface)
  root.style.setProperty("--muted-foreground", theme.colors.muted)
  root.style.setProperty("--accent", theme.colors.surface)
  root.style.setProperty("--accent-foreground", theme.colors.aiText)
  root.style.setProperty("--border", theme.colors.border)
  root.style.setProperty("--input", theme.colors.input)
  root.style.setProperty("--ring", theme.colors.accent)
  root.style.setProperty("--sidebar", theme.colors.sidebar)
  root.style.setProperty("--sidebar-foreground", theme.colors.aiText)
  root.style.setProperty("--sidebar-border", theme.colors.border)
}

export function ThemeProvider({
  children,
  theme,
  themes,
  locked,
  setTheme,
  toggleLock,
  rotate,
}: {
  children: ReactNode
  theme: Theme
  themes: Theme[]
  locked: boolean
  setTheme: (id: number) => void
  toggleLock: () => void
  rotate: () => void
}) {
  useEffect(() => {
    applyThemeCSS(theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, themes, locked, setTheme, toggleLock, rotate }}>
      {children}
    </ThemeContext.Provider>
  )
}
