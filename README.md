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

## Ecosystem

Part of the [AI小木屋](https://github.com/AliceLJY) toolkit:

| Project | What It Does |
|---------|-------------|
| [content-alchemy](https://github.com/AliceLJY/content-alchemy) | 5-stage content pipeline (v5.0): Research → Writing |
| [content-publisher](https://github.com/AliceLJY/content-publisher) | Image generation, layout formatting, and WeChat API publishing |
| [openclaw-worker](https://github.com/AliceLJY/openclaw-worker) | Task API + Worker for bot-driven AI CLI automation |
| [openclaw-cli-bridge](https://github.com/AliceLJY/openclaw-cli-bridge) | Discord → CC/Codex/Gemini bridge |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram → CC/Codex via Agent SDK |
| [digital-clone-skill](https://github.com/AliceLJY/digital-clone-skill) | Extract writing DNA for personalized content voice |
| [local-memory](https://github.com/AliceLJY/local-memory) | Hybrid search over AI conversation transcripts |

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY)) · WeChat: **我的AI小木屋**

> 医学出身，文化口工作，AI 野路子。公众号六大板块：AI实操手账 · AI踩坑实录 · AI照见众生 · AI冷眼旁观 · AI胡思乱想 · AI视觉笔记

Six content pillars: **Hands-on AI** · **AI Pitfall Diaries** · **AI & Humanity** · **AI Cold Eye** · **AI Musings** · **AI Visual Notes**

## License

MIT
