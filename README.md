# CC Shell

A lightweight chat UI for Claude Code — rotating themes, clean copy, session management.

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

Part of the [AliceLJY](https://github.com/AliceLJY) toolkit:

| Project | What It Does |
|---------|-------------|
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram bridge for Claude / Codex / Gemini via Agent SDK |
| [telegram-cli-bridge](https://github.com/AliceLJY/telegram-cli-bridge) | Telegram CLI bridge (Gemini CLI path) |
| [recallnest](https://github.com/AliceLJY/recallnest) | MCP-native memory workbench for AI conversations |
| [content-alchemy](https://github.com/AliceLJY/content-alchemy) | 5-stage content pipeline: Research to Writing |
| [content-publisher](https://github.com/AliceLJY/content-publisher) | Image generation, layout formatting, and WeChat API publishing |
| [openclaw-tunnel](https://github.com/AliceLJY/openclaw-tunnel) | Docker-to-host tunnel for /cc, /codex, /gemini |
| [digital-clone-skill](https://github.com/AliceLJY/digital-clone-skill) | Extract writing DNA for personalized content voice |

## Author

Built by [@AliceLJY](https://github.com/AliceLJY)

## License

[MIT](LICENSE)
