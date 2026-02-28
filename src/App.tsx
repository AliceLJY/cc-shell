import { useState, useCallback } from "react"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { loadThemeState, saveThemeState, rotateTheme } from "@/lib/theme-rotation"
import type { Theme, ThemeState } from "@/types"
import themeCatalog from "../themes/theme-catalog.json"

const themes = themeCatalog as Theme[]

function App() {
  const [themeState, setThemeState] = useState<ThemeState>(loadThemeState)

  const currentTheme = themes.find((t) => t.id === themeState.currentThemeId) || themes[0]

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

  return (
    <ThemeProvider
      theme={currentTheme}
      themes={themes}
      locked={themeState.locked}
      setTheme={handleSetTheme}
      toggleLock={handleToggleLock}
      rotate={handleRotate}
    >
      <div
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: "var(--theme-bg)", color: "var(--theme-aiText)", fontFamily: "var(--theme-font)" }}
      >
        <h1 className="text-3xl font-bold" style={{ color: "var(--theme-accent)" }}>
          CC Shell — {currentTheme.name}
        </h1>
      </div>
    </ThemeProvider>
  )
}

export default App
