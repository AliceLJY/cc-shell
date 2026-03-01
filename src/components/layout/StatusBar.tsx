interface StatusBarProps {
  inputTokens: number
  outputTokens: number
  cost: number
  connected: boolean
}

export function StatusBar({ cost, connected }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {/* Left: Cost (only show when > 0) */}
      <div>{cost > 0 ? `$${cost.toFixed(4)}` : ""}</div>

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
