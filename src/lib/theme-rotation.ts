import type { Theme, ThemeState } from "@/types"

const STORAGE_KEY = "cc-shell-theme"
const HISTORY_KEY = "cc-shell-theme-history"

export function loadThemeState(): ThemeState {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return JSON.parse(stored)
  return { currentThemeId: 1, locked: false }
}

export function saveThemeState(state: ThemeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getNextThemeId(currentId: number, totalThemes: number): number {
  return (currentId % totalThemes) + 1
}

export function appendHistory(themeId: number): void {
  const history = localStorage.getItem(HISTORY_KEY) || ""
  const entry = `${new Date().toISOString()} theme:${themeId}\n`
  localStorage.setItem(HISTORY_KEY, history + entry)
}

export function rotateTheme(themes: Theme[], state: ThemeState): ThemeState {
  if (state.locked) return state
  const nextId = getNextThemeId(state.currentThemeId, themes.length)
  appendHistory(nextId)
  const newState = { ...state, currentThemeId: nextId }
  saveThemeState(newState)
  return newState
}
