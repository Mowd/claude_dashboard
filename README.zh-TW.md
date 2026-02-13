[English](README.md) | 繁體中文

# Claude Dashboard

以 Claude 驅動的多代理軟體開發儀表板。

![Claude Dashboard Screenshot](https://meee.com.tw/BF17g4Y.jpg)

## 功能特色

- **多代理流水線** — 自動化 PM → RD → UI → TEST → SEC 工作流程，每個代理擁有專屬職責與工具
- **即時串流輸出** — 透過 WebSocket 逐 token 顯示代理的推理過程與操作
- **互動式終端機** — 完整功能的終端機（xterm.js + node-pty），可即時檢視命令執行
- **工作流程管理** — 隨時暫停、恢復、取消執行中的工作流程
- **事件日誌與 token 追蹤** — 監控代理活動、工具使用情況，以及每個步驟的 token 消耗
- **SQLite 持久化** — 所有工作流程、代理輸出與指標皆持久保存，供事後檢閱

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 15、React 19、Tailwind CSS、Zustand |
| 後端 | Express、WebSocket (ws)、node-pty |
| 資料庫 | sql.js (SQLite WASM) |
| AI | Claude CLI |

## 前置需求

- **平台** — Windows、macOS、Linux
- **Node.js** 23.6+
- **Claude CLI** 已安裝並設定完成（[文件](https://docs.anthropic.com/en/docs/claude-cli)）

## 快速開始

```bash
npm install   # 安裝依賴套件
npm link      # 全域連結 CLI（僅需一次）
cd /path/to/your/project
cdb           # 啟動儀表板
```

## 代理角色

| 角色 | 職責 | 工具 | 逾時 |
|------|------|------|------|
| **PM** | 分析需求，產出結構化規格書 | Read | 3 分鐘 |
| **RD** | 設計後端架構，實作伺服器端程式碼 | Read、Edit、Bash | 10 分鐘 |
| **UI** | 設計並實作前端元件、頁面、樣式 | Read、Edit、Bash | 10 分鐘 |
| **TEST** | 撰寫並執行測試，回報覆蓋率與錯誤 | Read、Edit、Bash | 10 分鐘 |
| **SEC** | 安全性評估、弱點掃描、稽核 | Read、Bash | 5 分鐘 |

代理依序執行，每個代理接收所有前序代理的累積上下文。

## 專案結構

```
claude_dashboard/
├── bin/                  # CLI 啟動器 (cdb)
├── prompts/              # 代理系統提示詞模板
│   ├── pm-system.md
│   ├── rd-system.md
│   ├── ui-system.md
│   ├── test-system.md
│   └── sec-system.md
├── server.ts             # Express + WebSocket 伺服器入口
├── src/
│   ├── app/              # Next.js 頁面與 API 路由
│   ├── components/       # React 元件
│   │   ├── agent/        #   代理卡片與輸出顯示
│   │   ├── events/       #   事件日誌
│   │   ├── history/      #   工作流程歷史紀錄
│   │   ├── layout/       #   外殼與導覽列
│   │   ├── pipeline/     #   流水線視覺化
│   │   ├── terminal/     #   xterm.js 終端機面板
│   │   ├── ui/           #   共用 UI 基礎元件
│   │   └── workflow/     #   工作流程啟動器
│   ├── hooks/            # 自定義 React hooks
│   ├── lib/
│   │   ├── agents/       #   提示詞載入與建構
│   │   ├── db/           #   SQLite schema、連線、查詢
│   │   ├── terminal/     #   PTY 管理器
│   │   ├── websocket/    #   WebSocket 伺服器與協議
│   │   └── workflow/     #   引擎、流水線、代理執行器
│   ├── stores/           # Zustand 狀態管理
│   └── types/            # TypeScript 型別定義
├── data/                 # SQLite 資料庫檔案
├── package.json
└── tsconfig.json
```

## ☕ Buy Me a Coffee

如果你覺得這個專案對你有幫助，可以請我喝杯咖啡喔！

<a href="https://buymeacoffee.com/mowd" target="_blank"><img src="https://mowd.tw/buymeacoffee.png" alt="Buy Me A Coffee" width="300"></a>

## 授權條款

[MIT](./LICENSE)
