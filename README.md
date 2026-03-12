# CC Shell (Archived)

> **This project has been archived.**
> I no longer maintain it as an active product.

CC Shell was an experiment: a lightweight shell/UI wrapper around Claude Code.
It is no longer part of my main workflow.

> 这是一个给 Claude Code 套壳的实验项目，现已归档，不再作为主力产品维护。

A lightweight chat UI for Claude Code — rotating themes, clean copy, session management.

> 为 Claude Code 打造的轻量聊天界面，带主题轮换、干净复制、会话管理。

## Why Archived

- My primary remote workflow has moved to `telegram-ai-bridge` and `telegram-cli-bridge`
- A custom UI shell for Claude Code no longer adds enough value
- There are already stronger and more mature tools in the same category

> 归档原因：我的主工作流已经转向 `telegram-ai-bridge` 和 `telegram-cli-bridge`。继续手搓一个 CC 壳子意义不大，而且同类已有更成熟方案。

## Recommended Alternatives

- [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) — Telegram bridge for Claude / Codex / Gemini via SDK
- [telegram-cli-bridge](https://github.com/AliceLJY/telegram-cli-bridge) — Telegram bridge via task-api, especially useful when full CLI capability is needed

> 替代方案：优先看 `telegram-ai-bridge` 和 `telegram-cli-bridge`。

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
| [digital-clone-skill](https://github.com/AliceLJY/digital-clone-skill) | Extract writing DNA for personalized content voice |
| [recallnest](https://github.com/AliceLJY/recallnest) | MCP-native memory workbench for AI conversations |
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram → CC/Codex/Gemini via Agent SDK |
| [telegram-cli-bridge](https://github.com/AliceLJY/telegram-cli-bridge) | Telegram CLI bridge (Gemini CLI path) |

## Author

Built by **小试AI** ([@AliceLJY](https://github.com/AliceLJY)) · WeChat: **我的AI小木屋**

> 医学出身，文化口工作，AI 野路子。公众号六大板块：AI实操手账 · AI踩坑实录 · AI照见众生 · AI冷眼旁观 · AI胡思乱想 · AI视觉笔记

Six content pillars: **Hands-on AI** · **AI Pitfall Diaries** · **AI & Humanity** · **AI Cold Eye** · **AI Musings** · **AI Visual Notes**

## License

MIT
