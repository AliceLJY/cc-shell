# CC Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight chat UI for Claude Code with rotating themes, clean copy, and session management.

**Architecture:** Vite + React SPA frontend communicating via SSE with a Bun HTTP backend that wraps the Claude Agent SDK V1 `query()` API. Theme rotation uses a flat-file ring buffer pattern (sequential catalog + append-only history log).

**Tech Stack:** Bun, Vite, React 19, Tailwind CSS 4, shadcn/ui, Shiki, react-markdown, @anthropic-ai/claude-agent-sdk

**Important SDK note:** V2 API (`unstable_v2_createSession`) does NOT yet support `canUseTool` permission callbacks or `includePartialMessages`. We use V1 `query()` API which supports both. `listSessions()` is available separately.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `server/server.ts` (placeholder)

**Step 1: Scaffold Vite + React + TypeScript**

```bash
cd ~/cc-shell
bun create vite . --template react-ts
# When prompted about non-empty directory, select "Remove existing files and continue"
bun install
```

**Step 2: Install Tailwind CSS 4**

```bash
bun add -D tailwindcss @tailwindcss/vite
```

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Update `vite.config.ts`:
```typescript
import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
})
```

**Step 3: Configure TypeScript path aliases**

Add to both `tsconfig.json` and `tsconfig.app.json` under `compilerOptions`:
```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

Install node types:
```bash
bun add -D @types/node
```

**Step 4: Initialize shadcn/ui**

```bash
bunx shadcn@latest init
```

Select: New York style, Neutral color, CSS variables: yes.

Add base components:
```bash
bunx shadcn@latest add button dialog scroll-area dropdown-menu tooltip separator
```

**Step 5: Install remaining dependencies**

```bash
# Frontend
bun add react-markdown remark-gfm rehype-raw react-shiki react-diff-viewer-continued lucide-react

# Backend
bun add @anthropic-ai/claude-agent-sdk

# Dev tooling
bun add -D concurrently
```

**Step 6: Set up dev scripts in `package.json`**

Add/replace scripts:
```json
{
  "scripts": {
    "dev": "concurrently --names \"VITE,BUN\" --prefix-colors \"cyan,yellow\" \"bunx --bun vite\" \"bun --watch run server/server.ts\"",
    "dev:fe": "bunx --bun vite",
    "dev:server": "bun --watch run server/server.ts",
    "build": "bunx --bun vite build"
  }
}
```

**Step 7: Create backend placeholder**

`server/server.ts`:
```typescript
const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok" })
    }
    return new Response("Not found", { status: 404 })
  },
})

console.log(`CC Shell backend running on http://localhost:${server.port}`)
```

**Step 8: Verify everything works**

```bash
bun run dev
```

Expected: Vite serves on :5173, Bun backend on :3001, `curl http://localhost:3001/api/health` returns `{"status":"ok"}`.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding — Vite + React + Tailwind + shadcn + Bun backend"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

**Step 1: Define all shared types**

`src/types/index.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: define TypeScript types for themes, sessions, messages, SSE events"
```

---

### Task 3: Theme System — Catalog, Rotation Logic, and Provider

**Files:**
- Create: `themes/theme-catalog.json`
- Create: `src/lib/theme-rotation.ts`
- Create: `src/components/theme/ThemeProvider.tsx`
- Create: `src/hooks/useTheme.ts`

**Step 1: Create theme catalog with 6 themes**

`themes/theme-catalog.json` — full 6-theme catalog with carefully designed color palettes. Each theme: id, name, nameEn, mood, category, colors (11 color tokens), font, borderRadius, bubbleStyle.

Themes:
1. 深海墨蓝 (Deep Ocean) — dark, deep navy blues + cyan accent
2. 暖杏拿铁 (Apricot Latte) — light, warm beige/cream + burnt orange accent
3. 霓虹终端 (Neon Terminal) — dark, black bg + neon green accent (classic hacker)
4. 竹林清风 (Bamboo Breeze) — light, pale green/white + emerald accent
5. 星空紫罗兰 (Violet Cosmos) — dark, deep purple + pink/violet accent
6. 纸墨素笺 (Ink & Paper) — light, pure white/warm gray + charcoal accent

**Step 2: Create rotation logic**

`src/lib/theme-rotation.ts`:
```typescript
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
```

**Step 3: Create ThemeProvider**

`src/components/theme/ThemeProvider.tsx`:
```typescript
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
```

**Step 4: Create useTheme hook**

`src/hooks/useTheme.ts`:
```typescript
import { useContext } from "react"
import { ThemeContext } from "@/components/theme/ThemeProvider"

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
```

**Step 5: Verify theme loads on page**

Update `src/App.tsx` to wrap with ThemeProvider, load catalog, apply first theme. Page background should change color.

**Step 6: Commit**

```bash
git add themes/ src/lib/theme-rotation.ts src/components/theme/ src/hooks/useTheme.ts src/App.tsx
git commit -m "feat: theme system — 6-theme catalog, rotation logic, CSS variable provider"
```

---

### Task 4: Backend — Session Management + SSE Streaming

**Files:**
- Rewrite: `server/server.ts`

**Step 1: Implement full backend**

`server/server.ts` — single file covering:

1. **`GET /api/sessions`** — calls `listSessions({ limit: 50 })`, returns `SessionInfo[]`
2. **`POST /api/sessions`** — creates new session with V1 `query()`, stores in `activeSessions` Map
3. **`POST /api/sessions/:id/msg`** — sends user message to active session via `streamInput`
4. **`GET /api/sessions/:id/stream`** — SSE endpoint that streams SDK messages to frontend, transforms each `SDKMessage` into our `SSEEvent` types
5. **`POST /api/sessions/:id/permission`** — resolves pending permission from `pendingPermissions` Map
6. **`POST /api/sessions/:id/stop`** — calls `session.close()` to interrupt
7. **`GET /api/models`** — returns `["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]`

Key implementation details:
- Use V1 `query()` with `canUseTool` callback for permission bridge
- `canUseTool` stores a Promise resolve function in `pendingPermissions` Map, pushes permission_request SSE event, then `await`s the user's response
- `includePartialMessages: true` for streaming text deltas
- CORS headers for Vite dev proxy
- Session Map keyed by sessionId for multi-session support

**Step 2: Test with curl**

```bash
# List sessions
curl http://localhost:3001/api/sessions | jq .

# Create session + send message (returns sessionId)
curl -X POST http://localhost:3001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-6"}'

# Stream (SSE)
curl -N http://localhost:3001/api/sessions/<id>/stream
```

**Step 3: Commit**

```bash
git add server/server.ts
git commit -m "feat: backend — session management, SSE streaming, permission bridge"
```

---

### Task 5: Frontend Layout Shell

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/StatusBar.tsx`
- Update: `src/App.tsx`
- Update: `src/index.css`

**Step 1: Add CSS variables to index.css**

`src/index.css` — after `@import "tailwindcss"`, add `@theme` block defining CSS custom properties that map to `--theme-*` variables. Define base layout tokens.

**Step 2: Build AppShell**

`src/components/layout/AppShell.tsx` — flex container: collapsible sidebar (280px default, resizable) + main content area (flex-1). Sidebar collapse via state toggle.

**Step 3: Build Sidebar**

`src/components/layout/Sidebar.tsx`:
- "New Chat" button at top
- Session list grouped by date: "Today" / "Yesterday" / "Earlier"
- Each session item: title (first prompt truncated to 30 chars) + relative time ("2h ago")
- Active session highlighted with accent color
- Click to switch session
- Uses shadcn ScrollArea

**Step 4: Build TopBar**

`src/components/layout/TopBar.tsx`:
- Left: "CC Shell" text logo
- Right: theme toggle (sun/moon icon), theme picker button (palette icon)
- Lucide icons: `Sun`, `Moon`, `Palette`

**Step 5: Build StatusBar**

`src/components/layout/StatusBar.tsx`:
- Left: token usage "12.3k in / 8.1k out"
- Center: estimated cost "$0.42"
- Right: connection status dot (green = connected, red = disconnected)

**Step 6: Wire into App.tsx**

Compose: ThemeProvider → AppShell → (TopBar + Sidebar + ChatArea placeholder + StatusBar)

**Step 7: Verify layout renders correctly**

```bash
bun run dev
# Open http://localhost:5173, verify three-panel layout with theme colors
```

**Step 8: Commit**

```bash
git add src/components/layout/ src/App.tsx src/index.css
git commit -m "feat: layout shell — AppShell, Sidebar, TopBar, StatusBar"
```

---

### Task 6: Theme Picker UI

**Files:**
- Create: `src/components/theme/ThemePicker.tsx`

**Step 1: Build ThemePicker dialog**

`src/components/theme/ThemePicker.tsx`:
- Uses shadcn Dialog, triggered by palette icon in TopBar
- Grid of 6 theme cards (2 columns × 3 rows)
- Each card shows: color preview swatch (4-circle palette), name, nameEn, mood tag
- Active theme has accent border + checkmark
- Lock toggle switch at bottom: "Lock current theme" with Lock/Unlock icon
- Click a card → instant preview (apply CSS vars), close dialog → confirm

**Step 2: Wire into TopBar**

TopBar palette button opens ThemePicker dialog.

**Step 3: Verify theme switching**

Click different themes, verify entire UI recolors instantly. Toggle lock, create new session, verify rotation skipped when locked.

**Step 4: Commit**

```bash
git add src/components/theme/ThemePicker.tsx src/components/layout/TopBar.tsx
git commit -m "feat: theme picker — grid preview, instant switch, lock toggle"
```

---

### Task 7: Chat Core — Messages, Bubbles, Streaming

**Files:**
- Create: `src/components/chat/ChatView.tsx`
- Create: `src/components/chat/MessageList.tsx`
- Create: `src/components/chat/UserBubble.tsx`
- Create: `src/components/chat/AssistantBubble.tsx`
- Create: `src/components/chat/SystemMessage.tsx`
- Create: `src/components/chat/MessageInput.tsx`
- Create: `src/hooks/useSSE.ts`
- Create: `src/hooks/useSession.ts`
- Create: `src/hooks/useAutoScroll.ts`
- Create: `src/lib/api.ts`

**Step 1: Create API client**

`src/lib/api.ts`:
```typescript
const BASE = "/api"

export async function fetchSessions(): Promise<SessionInfo[]> {
  const res = await fetch(`${BASE}/sessions`)
  return res.json()
}

export async function createSession(model: string): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  })
  return res.json()
}

export async function sendMessage(sessionId: string, content: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/msg`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  })
}

export async function respondPermission(sessionId: string, requestId: string, allow: boolean): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/permission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, allow }),
  })
}

export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/stop`, { method: "POST" })
}
```

**Step 2: Create useSSE hook**

`src/hooks/useSSE.ts` — connects to `/api/sessions/:id/stream` via EventSource. Parses SSE events into `SSEEvent` union type. Dispatches to message state reducer. Handles reconnection on disconnect.

**Step 3: Create useSession hook**

`src/hooks/useSession.ts` — manages: active sessionId, messages array (useReducer), loading state, token usage, cost. Exposes: `sendMessage()`, `createSession()`, `switchSession()`.

**Step 4: Create useAutoScroll hook**

`src/hooks/useAutoScroll.ts` — ref to scroll container. Auto-scrolls to bottom on new messages. Detects user scroll-up and pauses auto-scroll. Resumes when user scrolls back to bottom.

**Step 5: Build bubbles**

`src/components/chat/UserBubble.tsx`:
- Right-aligned, rounded corners (theme borderRadius), theme userBubble bg
- Markdown rendered via react-markdown + remark-gfm
- Timestamp bottom-right, muted color

`src/components/chat/AssistantBubble.tsx`:
- Left-aligned, theme aiBubble bg
- Markdown rendered with syntax-highlighted code blocks (integrate CodeBlock component — placeholder for now, full implementation in Task 8)
- Tool call cards embedded (placeholder slots)
- Timestamp bottom-right

`src/components/chat/SystemMessage.tsx`:
- Centered, muted text, no bubble, just text with icon

**Step 6: Build MessageList**

`src/components/chat/MessageList.tsx` — maps messages array to appropriate bubble components. Uses shadcn ScrollArea with useAutoScroll. Shows "Claude is thinking..." spinner during streaming.

**Step 7: Build MessageInput**

`src/components/chat/MessageInput.tsx`:
- Textarea (auto-grows up to 6 lines)
- Send button (arrow icon) — disabled when empty or streaming
- Model selector dropdown (Opus/Sonnet/Haiku) using shadcn DropdownMenu
- Stop button (square icon) — visible only during streaming
- Enter to send, Shift+Enter for newline

**Step 8: Build ChatView**

`src/components/chat/ChatView.tsx` — composes MessageList + MessageInput. Manages the send flow: user types → sendMessage API → SSE stream → messages update.

**Step 9: Wire into AppShell**

Replace chat area placeholder with ChatView. Connect session switching from Sidebar.

**Step 10: End-to-end test**

```bash
bun run dev
# Open browser, create new session, send "Hello", verify streaming response appears in bubbles
```

**Step 11: Commit**

```bash
git add src/components/chat/ src/hooks/ src/lib/api.ts
git commit -m "feat: chat core — message bubbles, SSE streaming, input bar, session management"
```

---

### Task 8: Tool Call Cards + Code Blocks + Diff View

**Files:**
- Create: `src/components/chat/CodeBlock.tsx`
- Create: `src/components/chat/ToolCall.tsx`
- Create: `src/components/chat/DiffView.tsx`
- Update: `src/components/chat/AssistantBubble.tsx`

**Step 1: Build CodeBlock**

`src/components/chat/CodeBlock.tsx`:
- Uses react-shiki for syntax highlighting
- Copy button top-right (copies raw code, shows checkmark on success)
- Language label top-left
- Max height 400px with overflow scroll
- Theme-aware: dark themes use `github-dark`, light themes use `github-light`

**Step 2: Build ToolCall card**

`src/components/chat/ToolCall.tsx`:
- Collapsed (default): single line with icon (per tool type: 📖 Read, ✏️ Edit, 💻 Bash, 🔍 Grep, 📁 Glob, 🌐 WebFetch), tool name, primary argument (file path or command), expand arrow ▸
- Expanded: shows full content — Read → CodeBlock with file content, Bash → command + output in CodeBlock, Edit → DiffView, others → JSON formatted input/output
- Click toggles collapsed/expanded
- Subtle border, slightly indented within assistant bubble

**Step 3: Build DiffView**

`src/components/chat/DiffView.tsx`:
- Wraps react-diff-viewer-continued
- Extracts old_string/new_string from Edit tool input
- Split view for wide screens, unified for narrow
- Dark/light theme via `useDarkTheme` prop linked to current theme category

**Step 4: Integrate into AssistantBubble**

Update `AssistantBubble.tsx`:
- Parse assistant message content blocks
- Text blocks → Markdown render (with CodeBlock for fenced code)
- tool_use blocks → ToolCall cards
- Custom react-markdown component override: `code` element → CodeBlock

**Step 5: Test with real tool calls**

```bash
bun run dev
# Send "Read the file ~/cc-shell/package.json" — verify tool call card appears and expands
```

**Step 6: Commit**

```bash
git add src/components/chat/CodeBlock.tsx src/components/chat/ToolCall.tsx src/components/chat/DiffView.tsx src/components/chat/AssistantBubble.tsx
git commit -m "feat: tool call cards — collapsible, CodeBlock with Shiki, DiffView for edits"
```

---

### Task 9: Permission Cards + Model Selector

**Files:**
- Create: `src/components/chat/PermissionCard.tsx`
- Update: `src/components/chat/MessageList.tsx`
- Update: `src/components/chat/MessageInput.tsx`

**Step 1: Build PermissionCard**

`src/components/chat/PermissionCard.tsx`:
- Warning-styled card (amber/yellow border on light themes, amber accent on dark)
- Shows: "Claude wants to execute:" + tool name + formatted input (command for Bash, file path for Edit, etc.)
- Three buttons: "Allow" (green), "Deny" (red), "Allow All This Session" (outline)
- Clicking calls `respondPermission()` API
- After response: card grays out and shows "Allowed" or "Denied" badge

**Step 2: Integrate into message flow**

Update `MessageList.tsx` — when SSE pushes `permission_request` event, insert PermissionCard inline in the message stream (between the last assistant message and the next one).

**Step 3: Polish model selector**

Update `MessageInput.tsx` — model selector shows current model with colored badge:
- Opus → purple badge
- Sonnet → blue badge
- Haiku → green badge

Switching model calls backend endpoint (or just stores locally for next session creation).

**Step 4: Test permission flow**

```bash
bun run dev
# Send "Run ls -la in the current directory" — verify permission card appears, click Allow, see output
```

**Step 5: Commit**

```bash
git add src/components/chat/PermissionCard.tsx src/components/chat/MessageList.tsx src/components/chat/MessageInput.tsx
git commit -m "feat: permission cards — inline approval UI, model selector badges"
```

---

### Task 10: Copy Experience

**Files:**
- Create: `src/components/chat/CopyToolbar.tsx`
- Create: `src/components/chat/MessageMenu.tsx`
- Update: `src/components/chat/UserBubble.tsx`
- Update: `src/components/chat/AssistantBubble.tsx`

**Step 1: Build floating copy toolbar**

`src/components/chat/CopyToolbar.tsx`:
- Listens to `selectionchange` event on document
- When text is selected within a message bubble, shows floating toolbar near selection
- Two buttons: "Copy" (plain text) and "Copy Markdown" (raw markdown source)
- Uses `window.getSelection()` to get text, `navigator.clipboard.writeText()` to copy
- Toolbar fades in/out with CSS transition

**Step 2: Build message context menu**

`src/components/chat/MessageMenu.tsx`:
- Three-dot menu (⋯) that appears on hover over any message bubble
- Options: "Copy message", "Copy as Markdown"
- Uses shadcn DropdownMenu

**Step 3: Integrate into bubbles**

Update `UserBubble.tsx` and `AssistantBubble.tsx`:
- Wrap content in relative container
- Add MessageMenu on hover (absolute positioned top-right)
- CopyToolbar is global (mounted once in ChatView, not per bubble)

**Step 4: Verify copy experience**

- Select text in a bubble → floating toolbar appears → click Copy → clipboard has clean text
- Hover message → ⋯ appears → Copy message → full message in clipboard
- Code block copy button → raw code only, no line numbers

**Step 5: Commit**

```bash
git add src/components/chat/CopyToolbar.tsx src/components/chat/MessageMenu.tsx src/components/chat/UserBubble.tsx src/components/chat/AssistantBubble.tsx
git commit -m "feat: copy experience — floating toolbar, message menu, clean text extraction"
```

---

### Task 11: Integration + Polish

**Files:**
- Update: various components
- Create: `README.md` (brief, English with Chinese blockquote)

**Step 1: Session auto-rotate theme**

In `App.tsx`, when `createSession()` is called, also call `rotateTheme()` if not locked. New session opens with next theme.

**Step 2: Sidebar session management**

- New session button triggers createSession + theme rotation
- Session list loads on mount via `fetchSessions()`
- Click session → `switchSession()` which sets active sessionId and connects SSE
- Active session highlighted with accent left border

**Step 3: Responsive sidebar**

- Screens < 768px: sidebar hidden by default, hamburger menu in TopBar to toggle
- Sidebar collapse stores width preference in localStorage

**Step 4: StatusBar live updates**

- Connect StatusBar to session state
- Update token counts and cost after each `result` SSE event
- Connection status: green dot when SSE connected, red when disconnected

**Step 5: Loading states**

- Session list: skeleton loading while fetching
- Chat area: "Claude is thinking..." with pulsing dots animation during streaming
- Empty state: friendly message when no session selected ("Start a new chat!")

**Step 6: Create README**

Brief README with: what it is, screenshot placeholder, quick start (`bun install && bun run dev`), tech stack list.

**Step 7: Final test**

Full workflow test:
1. `bun run dev` — both servers start
2. Open browser — layout renders with first theme
3. Create new session — theme rotates
4. Send message — streaming response with bubbles
5. Tool calls appear collapsed, expand on click
6. Permission cards work (allow/deny)
7. Copy text — clean, no garbage
8. Switch sessions — context preserved
9. Lock theme — rotation stops
10. Switch model — works

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: integration polish — theme rotation on new session, responsive sidebar, loading states"
```

---

### Task 12: GitHub Repository

**Step 1: Create remote repo**

```bash
cd ~/cc-shell
gh repo create cc-shell --public --description "A lightweight chat UI for Claude Code — rotating themes, clean copy, session management" --source .
```

**Step 2: Push**

```bash
git push -u origin main
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.vite/
*.local
themes/theme-history.txt
```

**Step 4: Final commit + push**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
git push
```

---

## Summary

| Task | What | Est. Files |
|------|------|-----------|
| 1 | Project scaffolding | 8 |
| 2 | TypeScript types | 1 |
| 3 | Theme system | 4 |
| 4 | Backend server | 1 |
| 5 | Layout shell | 5 |
| 6 | Theme picker UI | 2 |
| 7 | Chat core + streaming | 10 |
| 8 | Tool calls + code blocks | 4 |
| 9 | Permission cards | 3 |
| 10 | Copy experience | 4 |
| 11 | Integration + polish | ~5 |
| 12 | GitHub repo | 1 |

**Total: ~48 files, 12 tasks, 12 commits**
