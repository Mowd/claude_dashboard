import { WebSocket } from 'ws';

export interface ClientConnection {
  ws: WebSocket;
  id: string;
  subscribedWorkflows: Set<string>;
}

export class ConnectionManager {
  private clients: Map<string, ClientConnection> = new Map();
  private clientCounter = 0;

  addClient(ws: WebSocket): string {
    const id = `client-${++this.clientCounter}`;
    this.clients.set(id, {
      ws,
      id,
      subscribedWorkflows: new Set(),
    });
    return id;
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  subscribeToWorkflow(clientId: string, workflowId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedWorkflows.add(workflowId);
    }
  }

  /**
   * Send to all clients subscribed to a workflow
   */
  broadcastToWorkflow(workflowId: string, message: object) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.subscribedWorkflows.has(workflowId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  /**
   * Send to all connected clients
   */
  broadcastAll(message: object) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  /**
   * Send to a specific client
   */
  sendTo(clientId: string, message: object) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
