// === Theme Types ===
export interface ThemeColors {
  bg: string
  surface: string
  userBubble: string
  userText: string
  aiBubble: string
  aiText: string
  accent: string
  sidebar: string
  input: string
  border: string
  muted: string
}

export interface Theme {
  id: number
  name: string
  nameEn: string
  mood: string
  category: "暗色系" | "亮色系"
  colors: ThemeColors
  font: string
  borderRadius: string
  bubbleStyle: string
}

export interface ThemeState {
  currentThemeId: number
  locked: boolean
}

// === Session Types ===
export interface SessionInfo {
  sessionId: string
  summary: string
  lastModified: number
  firstPrompt?: string
  cwd?: string
}

// === Message Types ===
export type MessageRole = "user" | "assistant" | "system"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  model?: string
  toolCalls?: ToolCallInfo[]
  usage?: TokenUsage
}

export interface ToolCallInfo {
  id: string
  name: string
  input: Record<string, unknown>
  output?: string
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
}

// === Permission Types ===
export interface PermissionRequest {
  requestId: string
  toolName: string
  toolInput: Record<string, unknown>
  description: string
}

// === SSE Event Types ===
export type SSEEvent =
  | { type: "system_init"; sessionId: string; model: string }
  | { type: "text_delta"; text: string }
  | { type: "assistant_message"; message: ChatMessage }
  | { type: "tool_call"; toolCall: ToolCallInfo }
  | { type: "permission_request"; request: PermissionRequest }
  | { type: "result"; cost: number; usage: TokenUsage; duration: number }
  | { type: "error"; message: string }
  | { type: "status"; text: string }
