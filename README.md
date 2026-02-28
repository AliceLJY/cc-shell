# CC Shell

A lightweight chat UI for Claude Code — rotating themes, clean copy, session management.

> 为 Claude Code 打造的轻量聊天界面，带主题轮换、干净复制、会话管理。

## Quick Start

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173 | Backend: http://localhost:3001

## Tech Stack

- **Frontend:** Vite, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Bun, Claude Agent SDK
- **Features:** 6 rotating themes, SSE streaming, syntax highlighting (Shiki), diff view, permission cards, session management

## Architecture

```
src/
  components/
    chat/       # Message bubbles, input, tool cards, permissions
    layout/     # AppShell, Sidebar, TopBar, StatusBar
    theme/      # ThemeProvider, ThemePicker
  hooks/        # useSession, useSSE, useTheme, useAutoScroll
  lib/          # API client, theme rotation logic
  types/        # Shared TypeScript types
server/
  server.ts     # Bun HTTP server with SSE streaming
themes/
  theme-catalog.json  # 6 theme definitions
```
