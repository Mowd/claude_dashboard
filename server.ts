import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createServer as createNetServer } from 'net';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { ConnectionManager } from './src/lib/websocket/connection-manager.ts';
import { setupWebSocketHandlers } from './src/lib/websocket/server.ts';
import { WorkflowEngine } from './src/lib/workflow/engine.ts';
import { PtyManager } from './src/lib/terminal/pty-manager.ts';
import { initDb, closeDb } from './src/lib/db/connection.ts';
import * as queries from './src/lib/db/queries.ts';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const projectPath = process.env.PROJECT_PATH || process.cwd();

function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryPort = (port: number) => {
      const tester = createNetServer();
      tester.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempt < maxAttempts) {
          attempt++;
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
      tester.listen(port, () => {
        tester.close(() => resolve(port));
      });
    };
    tryPort(startPort);
  });
}

async function main() {
  const requestedPort = parseInt(process.env.PORT || '3000', 10);
  const port = await findAvailablePort(requestedPort);
  if (port !== requestedPort) {
    console.log(`[Server] Port ${requestedPort} in use, using ${port}`);
  }

  // @ts-expect-error next CJS default export is callable but nodenext types don't reflect this
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  // Initialize database
  await initDb();
  console.log('[DB] sql.js initialized');

  // Initialize managers
  const connectionManager = new ConnectionManager();
  const ptyManager = new PtyManager();

  // Initialize workflow engine with DB operations
  const engine = new WorkflowEngine({
    createWorkflow: queries.createWorkflow,
    updateWorkflowStatus: queries.updateWorkflowStatus,
    updateStepStatus: queries.updateStepStatus,
    getStepsForWorkflow: queries.getStepsForWorkflow,
  });

  // Create HTTP server
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  // Create WebSocket server (noServer mode)
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '/');

    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      // Pass through to Next.js HMR WebSocket in dev mode
      // Do not destroy - Next.js handles its own HMR WebSocket upgrades
    }
  });

  // Setup WebSocket handlers
  setupWebSocketHandlers(wss, connectionManager, engine, ptyManager, projectPath);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down...');
    ptyManager.killAll();
    closeDb();
    server.close(() => {
      process.exit(0);
    });
    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.listen(port, () => {
    console.log(`[Server] Claude Dashboard running at http://${hostname}:${port}`);
    console.log(`[Server] Project path: ${projectPath}`);
    console.log(`[Server] WebSocket: ws://${hostname}:${port}/ws`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
