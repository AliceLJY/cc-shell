import { Check, Lock, Unlock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/hooks/useTheme"

interface ThemePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemePicker({ open, onOpenChange }: ThemePickerProps) {
  const { theme: currentTheme, themes, locked, setTheme, toggleLock } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        style={{
          backgroundColor: "var(--theme-surface)",
          borderColor: "var(--theme-border)",
          color: "var(--theme-aiText)",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: "var(--theme-aiText)" }}>Choose Theme</DialogTitle>
        </DialogHeader>

        {/* Theme grid */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          {themes.map((t) => {
            const isActive = t.id === currentTheme.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id)
                  onOpenChange(false)
                }}
                className="relative p-3 rounded-lg text-left transition-all border-2"
                style={{
                  backgroundColor: t.colors.bg,
                  borderColor: isActive ? t.colors.accent : t.colors.border,
                  boxShadow: isActive ? `0 0 0 1px ${t.colors.accent}` : "none",
                }}
              >
                {/* Active checkmark */}
                {isActive && (
                  <div
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: t.colors.accent }}
                  >
                    <Check className="h-3 w-3" style={{ color: t.colors.bg }} />
                  </div>
                )}

                {/* Color swatches */}
                <div className="flex gap-1.5 mb-2">
                  {[t.colors.bg, t.colors.userBubble, t.colors.aiBubble, t.colors.accent].map(
                    (color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: color, borderColor: t.colors.border }}
                      />
                    )
                  )}
                </div>

                {/* Name */}
                <div className="text-sm font-medium" style={{ color: t.colors.aiText }}>
                  {t.name}
                </div>
                <div className="text-xs" style={{ color: t.colors.muted }}>
                  {t.nameEn}
                </div>

                {/* Mood tag */}
                <div
                  className="text-xs mt-1 inline-block px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: t.colors.accent + "22",
                    color: t.colors.accent,
                  }}
                >
                  {t.mood}
                </div>
              </button>
            )
          })}
        </div>

        {/* Lock toggle */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid var(--theme-border)` }}>
          <span className="text-sm" style={{ color: "var(--theme-muted)" }}>
            Lock current theme
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLock}
            className="gap-1.5"
            style={{
              borderColor: "var(--theme-border)",
              color: locked ? "var(--theme-accent)" : "var(--theme-muted)",
              backgroundColor: "transparent",
            }}
          >
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {locked ? "Locked" : "Unlocked"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
