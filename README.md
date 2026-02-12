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
| Database | better-sqlite3 |
| AI | Claude CLI |

## Prerequisites

- **Node.js** 23.6+
- **Claude CLI** installed and configured ([docs](https://docs.anthropic.com/en/docs/claude-cli))

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev

# Open in browser
open http://localhost:3000
```

## CLI

The project includes a `cdb` launcher for convenience:

```bash
# Link globally (one-time)
npm link

# Launch the dashboard
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

## ☕ Buy Me a Coffee

If you find this project helpful, consider buying me a coffee!

<a href="https://buymeacoffee.com/mowd" target="_blank"><img src="https://mowd.tw/buymeacoffee.png" alt="Buy Me A Coffee" width="300"></a>

## License

[MIT](./LICENSE)
