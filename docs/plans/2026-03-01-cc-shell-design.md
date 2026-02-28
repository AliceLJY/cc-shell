# CC Shell — Design Document

> A lightweight desktop chat UI for Claude Code.
> Designed for comfort: readable bubbles, clean copy, rotating themes.

## 1. Project Overview

**Name:** CC Shell
**Purpose:** Replace the terminal interface of Claude Code with a polished chat UI that solves three pain points: messy text copying, painful text editing, and buried session management.

**What it is:** A local web app (Vite + React frontend, Bun backend) that wraps the Claude Agent SDK to provide a Telegram/Claude App-style conversational interface.

**What it is NOT:** An IDE, a file browser, or a settings editor. It's a chat skin.

**Deployment model:** Phase 1 — local web app (`bun dev` → browser). Phase 2 — Electron desktop app (future).

## 2. Architecture

```
Browser (Vite + React :5173)  ←SSE→  Bun API Server (:3001)  ←SDK→  Claude Agent SDK V2
```

- **Frontend:** Pure React SPA. Renders chat bubbles, handles user input, manages themes.
- **Backend:** Single `server.ts` file (~200-300 lines). Wraps Agent SDK V2 session lifecycle, streams responses via SSE, bridges permission requests.
- **Storage:** No custom database. Sessions persisted by SDK in `~/.claude/projects/`. UI state in `localStorage`. Theme rotation in `theme-history.txt`.

## 3. Layout

```
┌──────────────────────────────────────────────────────────┐
│  CC Shell                            ☀️/🌙  ⚙️  🎨      │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Session   │              Chat Area                      │
│  List      │                                             │
│            │  User bubbles → right, with background      │
│  - Title   │  AI bubbles   → left, lighter background    │
│  - Time    │  Tool calls   → collapsed cards             │
│            │  Permissions  → inline approval cards        │
│            │                                             │
│  [+ New]   │  ┌─────────────────────────────────────┐    │
│            │  │ 📎  Type message...     Opus ▾  ➤  │    │
│            │  └─────────────────────────────────────┘    │
├────────────┴─────────────────────────────────────────────┤
│  tokens: 12.3k in / 8.1k out   cost: $0.42   ◉ online  │
└──────────────────────────────────────────────────────────┘
```

- Left sidebar: collapsible, shows sessions grouped by date (Today / Yesterday / Earlier)
- Chat area: mixed bubble style — rounded corners, not wall-hugging, generous whitespace
- Input bar: bottom-fixed, integrates model selector dropdown + send button
- Status bar: token usage, estimated cost, connection status

## 4. Theme System

### Structure

Each theme defines a complete color palette via CSS variables:

```json
{
  "id": 1,
  "name": "深海墨蓝",
  "nameEn": "Deep Ocean",
  "mood": "沉静/专注/深夜coding",
  "category": "暗色系",
  "colors": {
    "bg": "#0a1628",
    "surface": "#112240",
    "userBubble": "#1e3a5f",
    "userText": "#e6f1ff",
    "aiBubble": "#1a2a44",
    "aiText": "#ccd6f6",
    "accent": "#64ffda",
    "sidebar": "#0d1f3c",
    "input": "#112240",
    "border": "#233554",
    "muted": "#8892b0"
  },
  "font": "system-ui",
  "borderRadius": "12px",
  "bubbleStyle": "soft-shadow"
}
```

### Initial 6 Themes

| # | Name | Mood | Light/Dark |
|---|---|---|---|
| 1 | 深海墨蓝 (Deep Ocean) | 沉静/专注 | Dark |
| 2 | 暖杏拿铁 (Apricot Latte) | 温暖/午后 | Light |
| 3 | 霓虹终端 (Neon Terminal) | 赛博/极客 | Dark |
| 4 | 竹林清风 (Bamboo Breeze) | 自然/舒展 | Light |
| 5 | 星空紫罗兰 (Violet Cosmos) | 梦幻/灵感 | Dark |
| 6 | 纸墨素笺 (Ink & Paper) | 极简/书卷 | Light |

### Rotation Logic

- **Auto:** New session → next theme in sequence, index appended to `theme-history.txt`
- **Manual:** Top bar palette button → theme picker overlay with live preview
- **Lock:** User can lock a theme; auto-rotation skips until unlocked
- **State:** `localStorage` stores `{ currentThemeId, locked: boolean }`

## 5. Message Rendering

### Four card types

1. **User message** — right-aligned bubble, theme `userBubble` color, Markdown rendered, timestamp bottom-right
2. **Assistant message** — left-aligned bubble, theme `aiBubble` color, Markdown + syntax-highlighted code blocks, tool call cards embedded
3. **Permission request** — warning-styled inline card with Allow / Deny / Allow All buttons
4. **System message** — centered, muted text (session restored, connection status, etc.)

### Tool Call Cards

- Default: collapsed single line — icon + tool name + file path + expand arrow
- Expanded: syntax-highlighted content (Read), diff view (Edit), command + output (Bash)
- Edit tool shows red/green diff comparison

### Code Blocks

- Syntax highlighting: Shiki (theme-aware)
- Copy button top-right of every code block (copies raw code, no line numbers, no ANSI)
- Max height with scroll for long blocks

### Copy Experience (Core Pain Point Fix)

- Text selection shows floating toolbar: `[Copy] [Copy as Markdown]`
- Code block one-click copy: pure code, zero garbage
- Message-level copy: hover `⋯` menu → copy entire message
- HTML rendering = zero terminal character pollution

### Streaming

- Typewriter effect for Claude responses
- Auto-scroll to bottom, stops if user scrolls up
- "Claude is thinking..." indicator + stop button during streaming

## 6. Backend API

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/sessions` | List sessions via `listSessions()` |
| POST | `/api/sessions` | Create new session via `createSession()` |
| POST | `/api/sessions/:id/msg` | Send message via `session.send()` |
| GET | `/api/sessions/:id/stream` | SSE stream via `session.stream()` |
| POST | `/api/sessions/:id/permission` | Respond to permission request |
| POST | `/api/sessions/:id/model` | Switch model via `setModel()` |
| POST | `/api/sessions/:id/stop` | Interrupt via `session.interrupt()` |
| GET | `/api/models` | List available models |

### Permission Bridge

1. Backend receives permission event from SDK stream
2. Stores in `pendingPermissions` Map (keyed by requestId)
3. Pushes to frontend via SSE
4. Frontend renders PermissionCard
5. User clicks Allow/Deny → POST /permission
6. Backend resolves the pending permission → SDK continues

### Session Lifecycle

- Sessions managed entirely by Agent SDK V2
- `createSession()` → returns sessionId
- `resumeSession(id)` → restores context
- No custom database — SDK handles `.jsonl` persistence

## 7. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Bun | User's preferred runtime, fast, native TS |
| Frontend | Vite + React 19 | Lightweight, fast HMR |
| UI Components | shadcn/ui + Radix | Themeable, accessible |
| Styling | Tailwind CSS 4 | CSS variable driven, theme switching |
| Markdown | react-markdown + remark-gfm | Render Claude responses |
| Code Highlighting | Shiki | Theme-aware, customizable |
| Diff View | react-diff-viewer-continued | Edit tool visualization |
| Agent SDK | @anthropic-ai/claude-agent-sdk | V2 API, session management |
| State Management | React Context + useReducer | Sufficient, no Redux needed |
| Icons | Lucide React | Lightweight, consistent |

## 8. Project Structure

```
cc-shell/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── server/
│   └── server.ts                  # Single-file Bun backend
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/                # AppShell, Sidebar, TopBar, StatusBar
│   │   ├── chat/                  # ChatView, Bubbles, ToolCall, PermissionCard, CodeBlock, DiffView, MessageInput
│   │   ├── theme/                 # ThemePicker, ThemeProvider
│   │   └── ui/                    # Base components (Button, Dialog, ScrollArea, etc.)
│   ├── hooks/                     # useSSE, useSession, useTheme, useAutoScroll
│   ├── lib/                       # api.ts, theme-rotation.ts
│   └── types/                     # TypeScript interfaces
├── themes/
│   ├── theme-catalog.json
│   └── theme-history.txt
└── docs/
    └── plans/
```

## 9. YAGNI — Explicitly Out of Scope

- ❌ File tree panel (not an IDE)
- ❌ MCP server management (use terminal)
- ❌ Settings editor (edit `settings.json` directly)
- ❌ User authentication (single local user)
- ❌ Custom database (SDK handles session persistence)
- ❌ Remote Control integration (use terminal for that)

## 10. Future Phases

- **Phase 2:** Electron packaging (desktop app)
- **Phase 3:** Theme catalog expansion (20+ themes)
- **Phase 4:** File attachment support (images, documents)
- **Phase 5:** Keyboard shortcuts (Cmd+K command palette)
