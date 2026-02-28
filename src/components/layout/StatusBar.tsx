interface StatusBarProps {
  inputTokens: number
  outputTokens: number
  cost: number
  connected: boolean
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function StatusBar({ inputTokens, outputTokens, cost, connected }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Token usage */}
      <div>
        {formatTokens(inputTokens)} in / {formatTokens(outputTokens)} out
      </div>

      {/* Center: Cost */}
      <div>${cost.toFixed(4)}</div>

      {/* Right: Connection status */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: connected ? "#22c55e" : "#ef4444" }}
        />
        <span>{connected ? "connected" : "disconnected"}</span>
      </div>
    </div>
  )
}
