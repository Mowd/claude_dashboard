#!/usr/bin/env node

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const projectPath = process.cwd();
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "localhost";
  const dashboardDir = path.resolve(__dirname, "..");

  console.log(`\x1b[35m[Claude Dashboard]\x1b[0m Starting...`);
  console.log(`  Project: ${projectPath}`);
  console.log(`  Dashboard: http://${host}:${port}`);
  console.log();

  const serverProcess = spawn("node", ["server.ts"], {
    cwd: dashboardDir,
    env: {
      ...process.env,
      PROJECT_PATH: projectPath,
      PORT: String(port),
      HOST: host,
    },
    stdio: "inherit",
  });

  // Wait a bit then open browser
  setTimeout(async () => {
    try {
      const open = (await import("open")).default;
      await open(`http://${host}:${port}`);
    } catch {
      console.log(`\x1b[35m[Claude Dashboard]\x1b[0m Open http://${host}:${port} in your browser`);
    }
  }, 3000);

  // Graceful shutdown
  const shutdown = () => {
    console.log(`\n\x1b[35m[Claude Dashboard]\x1b[0m Shutting down...`);
    serverProcess.kill("SIGTERM");
    setTimeout(() => process.exit(0), 3000);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  serverProcess.on("exit", (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
