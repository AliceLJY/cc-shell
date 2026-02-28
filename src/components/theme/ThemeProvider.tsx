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
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--theme-${key}`, value)
  }
  root.style.setProperty("--theme-font", theme.font)
  root.style.setProperty("--theme-radius", theme.borderRadius)
  root.setAttribute("data-theme-category", theme.category)
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
