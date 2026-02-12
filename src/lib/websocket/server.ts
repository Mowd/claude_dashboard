import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ConnectionManager } from './connection-manager';
import { WorkflowEngine } from '../workflow/engine';
import { PtyManager } from '../terminal/pty-manager';

export function setupWebSocketHandlers(
  wss: WebSocketServer,
  connectionManager: ConnectionManager,
  engine: WorkflowEngine,
  ptyManager: PtyManager,
  projectPath: string
) {
  // Wire workflow engine events to WebSocket broadcasts
  engine.on('workflow:created', (workflowId: string, title: string) => {
    connectionManager.broadcastAll({
      type: 'workflow:created',
      payload: { workflowId, title },
    });
  });

  engine.on('workflow:completed', (workflowId: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'workflow:completed',
      payload: { workflowId },
    });
  });

  engine.on('workflow:failed', (workflowId: string, error: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'workflow:failed',
      payload: { workflowId, error },
    });
  });

  engine.on('workflow:paused', (workflowId: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'workflow:paused',
      payload: { workflowId },
    });
  });

  engine.on('workflow:cancelled', (workflowId: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'workflow:cancelled',
      payload: { workflowId },
    });
  });

  engine.on('step:started', (workflowId: string, stepId: string, role: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:started',
      payload: { workflowId, stepId, role },
    });
  });

  engine.on('step:stream', (workflowId: string, stepId: string, role: string, chunk: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:stream',
      payload: { workflowId, stepId, role, chunk },
    });
  });

  engine.on('step:completed', (workflowId: string, stepId: string, role: string, output: string, durationMs: number, tokensIn?: number, tokensOut?: number) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:completed',
      payload: { workflowId, stepId, role, output, durationMs, tokensIn, tokensOut },
    });
  });

  engine.on('step:failed', (workflowId: string, stepId: string, role: string, error: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:failed',
      payload: { workflowId, stepId, role, error },
    });
  });

  engine.on('step:activity', (workflowId: string, stepId: string, role: string, activity: any) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:activity',
      payload: { workflowId, stepId, role, activity },
    });
  });

  engine.on('step:retry', (workflowId: string, stepId: string, role: string, attempt: number, maxRetries: number, reason: string) => {
    connectionManager.broadcastToWorkflow(workflowId, {
      type: 'step:retry',
      payload: { workflowId, stepId, role, attempt, maxRetries, reason },
    });
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientId = connectionManager.addClient(ws);
    console.log(`[WS] Client connected: ${clientId}`);

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(clientId, ws, msg, connectionManager, engine, ptyManager, projectPath);
      } catch (err) {
        console.error('[WS] Invalid message:', err);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${clientId}`);
      connectionManager.removeClient(clientId);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Client ${clientId} error:`, err.message);
    });
  });
}

function handleClientMessage(
  clientId: string,
  ws: WebSocket,
  msg: any,
  connectionManager: ConnectionManager,
  engine: WorkflowEngine,
  ptyManager: PtyManager,
  defaultProjectPath: string
) {
  switch (msg.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'workflow:start': {
      const { prompt, projectPath } = msg.payload || {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        ws.send(JSON.stringify({
          type: 'workflow:failed',
          payload: { workflowId: null, error: 'Prompt is required' },
        }));
        break;
      }
      const path = projectPath || defaultProjectPath;
      engine.startWorkflow(prompt, path).then((workflowId) => {
        connectionManager.subscribeToWorkflow(clientId, workflowId);
      }).catch((err: any) => {
        console.error('[WS] Failed to start workflow:', err);
        ws.send(JSON.stringify({
          type: 'workflow:failed',
          payload: { workflowId: null, error: err.message },
        }));
      });
      break;
    }

    case 'workflow:subscribe': {
      const { workflowId } = msg.payload || {};
      if (workflowId) {
        connectionManager.subscribeToWorkflow(clientId, workflowId);
      }
      break;
    }

    case 'workflow:pause': {
      const { workflowId } = msg.payload || {};
      if (workflowId) engine.pauseWorkflow(workflowId);
      break;
    }

    case 'workflow:resume': {
      const { workflowId } = msg.payload || {};
      if (workflowId) engine.resumeWorkflow(workflowId);
      break;
    }

    case 'workflow:cancel': {
      const { workflowId } = msg.payload || {};
      if (workflowId) engine.cancelWorkflow(workflowId);
      break;
    }

    case 'terminal:create': {
      const { projectPath } = msg.payload || {};
      const path = projectPath || defaultProjectPath;
      try {
        const terminalId = ptyManager.create(path, (data: string) => {
          connectionManager.sendTo(clientId, {
            type: 'terminal:output',
            payload: { terminalId, data },
          });
        });
        connectionManager.sendTo(clientId, {
          type: 'terminal:created',
          payload: { terminalId },
        });
      } catch (err: any) {
        console.error('[WS] Failed to create terminal:', err.message);
        connectionManager.sendTo(clientId, {
          type: 'terminal:error',
          payload: { error: err.message },
        });
      }
      break;
    }

    case 'terminal:input': {
      const { terminalId, data } = msg.payload || {};
      if (terminalId && data != null) {
        ptyManager.write(terminalId, data);
      }
      break;
    }

    case 'terminal:resize': {
      const { terminalId, cols, rows } = msg.payload || {};
      if (terminalId && cols && rows) {
        ptyManager.resize(terminalId, cols, rows);
      }
      break;
    }

    case 'terminal:close': {
      const { terminalId } = msg.payload || {};
      if (terminalId) {
        ptyManager.kill(terminalId);
        connectionManager.sendTo(clientId, {
          type: 'terminal:closed',
          payload: { terminalId },
        });
      }
      break;
    }
  }
}
