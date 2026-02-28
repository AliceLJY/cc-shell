import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopBarProps {
  onOpenThemePicker: () => void
  themeName?: string
}

export function TopBar({ onOpenThemePicker, themeName }: TopBarProps) {
  return (
    <div className="flex items-center justify-between flex-1">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm" style={{ color: "var(--theme-accent)" }}>
          CC Shell
        </span>
        {themeName && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "var(--theme-muted)", backgroundColor: "var(--theme-bg)" }}>
            {themeName}
          </span>
        )}
      </div>

      {/* Right: Theme controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onOpenThemePicker}
          style={{ color: "var(--theme-muted)" }}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
