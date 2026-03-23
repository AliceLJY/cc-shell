# CC Shell

为 Claude Code 打造的轻量聊天界面，带主题轮换、干净复制、会话管理。

## 快速开始

```bash
npm install
npm run dev
```

前端：http://localhost:5173 | 后端：http://localhost:3001

## 技术栈

- **前端：** Vite、React 19、TypeScript、Tailwind CSS 4、shadcn/ui
- **后端：** Bun、Claude Agent SDK
- **功能：** 6 套轮换主题、SSE 流式传输、语法高亮（Shiki）、diff 视图、权限卡片、会话管理

## 项目结构

```
src/
  components/
    chat/       # 消息气泡、输入框、工具卡片、权限
    layout/     # AppShell、侧边栏、顶栏、状态栏
    theme/      # 主题提供器、主题选择器
  hooks/        # useSession、useSSE、useTheme、useAutoScroll
  lib/          # API 客户端、主题轮换逻辑
  types/        # 共享 TypeScript 类型
server/
  server.ts     # Bun HTTP 服务器（SSE 流式）
themes/
  theme-catalog.json  # 6 套主题定义
```

## 生态

[AliceLJY](https://github.com/AliceLJY) 工具箱的一部分：

| 项目 | 简介 |
|------|------|
| [telegram-ai-bridge](https://github.com/AliceLJY/telegram-ai-bridge) | Telegram 桥接 Claude / Codex / Gemini（Agent SDK） |
| [telegram-cli-bridge](https://github.com/AliceLJY/telegram-cli-bridge) | Telegram CLI 桥接（Gemini CLI 路径） |
| [recallnest](https://github.com/AliceLJY/recallnest) | MCP 原生记忆工作台 |
| [content-alchemy](https://github.com/AliceLJY/content-alchemy) | 五阶段内容流水线：调研到成文 |
| [content-publisher](https://github.com/AliceLJY/content-publisher) | 配图生成、排版格式化、微信公众号发布 |
| [openclaw-tunnel](https://github.com/AliceLJY/openclaw-tunnel) | Docker 到宿主机隧道，支持 /cc、/codex、/gemini |
| [digital-clone-skill](https://github.com/AliceLJY/digital-clone-skill) | 提取写作 DNA，生成个人化内容语音 |

## 作者

[@AliceLJY](https://github.com/AliceLJY)（公众号：**我的AI小木屋**）

## 许可证

[MIT](LICENSE)
