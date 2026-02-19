English | [繁體中文](README.zh-TW.md)

# Claude Dashboard

Multi-agent software development dashboard powered by Claude.

![Claude Dashboard Screenshot](https://meee.com.tw/BF17g4Y.jpg)

## Features

- **Multi-agent pipeline** — Automated PM → RD → UI → TEST → SEC workflow, each agent with dedicated responsibilities and tools
- **Real-time streaming output** — Token-by-token display of agent reasoning and actions via WebSocket
- **Interactive terminal** — Full-featured terminal (xterm.js + node-pty) for live command inspection
- **Workflow management** — Pause, resume, and cancel running workflows at any point
- **Event log & token tracking** — Monitor agent activities, tool usage, and token consumption per step
- **SQLite persistence** — All workflows, agent outputs, and metrics are persisted for later review

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand |
| Backend | Express, WebSocket (ws), node-pty |
| Database | sql.js (SQLite WASM) |
| AI | Claude CLI |

## Prerequisites

- **Platform** — Windows, macOS, Linux
- **Node.js** 23.6+
- **Claude CLI** installed and configured ([docs](https://docs.anthropic.com/en/docs/claude-cli))

## Quick Start

### Install via npm

```bash
npm install -g claude-dashboard
cd /path/to/your/project
cdb
```

### Install from source

```bash
git clone https://github.com/Mowd/claude_dashboard.git
cd claude_dashboard
npm install
npm link
cd /path/to/your/project
cdb
```

## Agent Roles

| Role | Responsibility | Tools | Timeout |
|------|---------------|-------|---------|
| **PM** | Analyze requirements, produce structured specifications | Read | 3 min |
| **RD** | Design backend architecture, implement server-side code | Read, Edit, Bash | 10 min |
| **UI** | Design and implement frontend components, pages, styling | Read, Edit, Bash | 10 min |
| **TEST** | Write and execute tests, report coverage and bugs | Read, Edit, Bash | 10 min |
| **SEC** | Security assessment, vulnerability scanning, audit | Read, Bash | 5 min |

Agents execute sequentially. Each agent receives the accumulated context from all prior agents.

## Project Structure

```
claude_dashboard/
├── bin/                  # CLI launcher (cdb)
├── prompts/              # Agent system prompt templates
│   ├── pm-system.md
│   ├── rd-system.md
│   ├── ui-system.md
│   ├── test-system.md
│   └── sec-system.md
├── server.ts             # Express + WebSocket server entry
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   │   ├── agent/        #   Agent cards & output display
│   │   ├── events/       #   Event log
│   │   ├── history/      #   Workflow history table
│   │   ├── layout/       #   Shell & navigation
│   │   ├── pipeline/     #   Pipeline visualization
│   │   ├── terminal/     #   xterm.js terminal panel
│   │   ├── ui/           #   Shared UI primitives
│   │   └── workflow/     #   Workflow launcher
│   ├── hooks/            # Custom React hooks
│   ├── lib/
│   │   ├── agents/       #   Prompt loading & construction
│   │   ├── db/           #   SQLite schema, connection, queries
│   │   ├── terminal/     #   PTY manager
│   │   ├── websocket/    #   WebSocket server & protocol
│   │   └── workflow/     #   Engine, pipeline, agent runner
│   ├── stores/           # Zustand state stores
│   └── types/            # TypeScript type definitions
├── data/                 # SQLite database files
├── package.json
└── tsconfig.json
```

## Changelog (0.1.0 → 0.5.0)

### 0.5.0

- Added **tool use summaries** in agent streaming output — live display of which tools (Read, Edit, Bash, etc.) each agent is invoking with key parameters.
- Fixed **horizontal scrollbar overflow** across all pages by adding overflow constraints at multiple CSS and component levels (prose word-break, grid clipping, vertical-only scroll on history pages).
- Improved **agent completion state** — clean final output replaces streaming chunks so tool summaries are shown during execution but removed from the finished result.

### 0.4.0

- Added **selectable execution plans** (`Full` / `Fast` / `Custom`) so small tasks can skip TEST/SEC when appropriate.
- Added **Impact Preview** before run start to estimate risk and suggest a run mode.
- Delivered broad **i18n support** (English + Traditional Chinese) with in-app language switcher and localized UI copy across dashboard, history, terminal, status labels, and events.

### 0.3.0

- Introduced **Workflow History** and **Workflow Detail** pages backed by SQLite persistence.
- Added **history filters, pagination, retention cleanup, and workflow metrics**.
- Added **templates, artifact summary, and retry-as-new-run** UX.
- Hardened API/DB initialization paths and fixed history 500 issues.
- Improved terminal reliability with route-switch reconnect/reattach fixes, including TUI (`htop`) restoration and replay buffering.

### 0.2.0

- Stabilized **npm package publishing and global install flow** (`cdb` launcher path and root detection fixes).
- Improved cross-platform compatibility by migrating DB runtime to **sql.js (SQLite WASM)**.
- Migrated server/tooling to **native ESM** and standardized test suite on **bun:test**.
- Updated installation and quick-start documentation.

### 0.1.0

- Initial public baseline of Claude Dashboard:
  - multi-agent PM→RD→UI→TEST→SEC pipeline
  - real-time WebSocket streaming output
  - integrated interactive terminal (xterm.js + node-pty)
  - core workflow controls (start/pause/resume/cancel)

## ☕ Buy Me a Coffee

If you find this project helpful, consider buying me a coffee!

<a href="https://buymeacoffee.com/mowd" target="_blank"><img src="https://mowd.tw/buymeacoffee.png" alt="Buy Me A Coffee" width="300"></a>

## License

[MIT](./LICENSE)
