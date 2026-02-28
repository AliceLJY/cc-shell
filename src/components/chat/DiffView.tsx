import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued"
import { useTheme } from "@/hooks/useTheme"

interface DiffViewProps {
  oldValue: string
  newValue: string
  fileName?: string
}

export function DiffView({ oldValue, newValue, fileName }: DiffViewProps) {
  const { theme } = useTheme()
  const isDark = theme.category === "暗色系"

  return (
    <div
      className="my-2 rounded-lg overflow-hidden text-sm"
      style={{ border: "1px solid var(--theme-border)" }}
    >
      {fileName && (
        <div
          className="px-3 py-1.5 text-xs font-mono"
          style={{
            backgroundColor: "var(--theme-surface)",
            borderBottom: "1px solid var(--theme-border)",
            color: "var(--theme-muted)",
          }}
        >
          {fileName}
        </div>
      )}
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={false}
        useDarkTheme={isDark}
        compareMethod={DiffMethod.WORDS}
        styles={{
          contentText: { fontSize: "13px", lineHeight: "1.5" },
        }}
      />
    </div>
  )
}
