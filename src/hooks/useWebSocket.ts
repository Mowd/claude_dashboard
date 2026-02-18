"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { useEventStore } from "@/stores/eventStore";
import { useTerminalStore } from "@/stores/terminalStore";
import { OutputBuffer } from "@/lib/output-buffer";
import type { AgentRole } from "@/lib/workflow/types";
import { AGENT_CONFIG, AGENT_ORDER, getStageForRole } from "@/lib/workflow/types";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buffersRef = useRef<Map<string, OutputBuffer>>(new Map());
  const allowReconnectRef = useRef(true);

  const { setWorkflow, setStatus, setCurrentStage, setCompleted } =
    useWorkflowStore();
  const {
    applyExecutionPlan,
    appendChunks,
    setAgentStarted,
    setAgentCompleted,
    setAgentFailed,
    setAgentActivity,
    setAgentRetry,
  } = useAgentStore();
  const addEvent = useEventStore((s) => s.addEvent);
  const { setTerminalId, setConnected } = useTerminalStore();

  const getOrCreateBuffer = useCallback(
    (role: AgentRole) => {
      const key = role;
      if (!buffersRef.current.has(key)) {
        const buffer = new OutputBuffer((chunks) => {
          appendChunks(role, chunks);
        }, 50);
        buffersRef.current.set(key, buffer);
      }
      return buffersRef.current.get(key)!;
    },
    [appendChunks]
  );

  const handleMessage = useCallback(
    (data: any) => {
      switch (data.type) {
        case "pong":
          break;

        case "workflow:created": {
          const { workflowId, title, executionPlan } = data.payload as {
            workflowId: string;
            title: string;
            executionPlan?: AgentRole[];
          };
          // Destroy old buffers so stale data from a previous workflow doesn't leak
          for (const buffer of buffersRef.current.values()) buffer.destroy();
          buffersRef.current.clear();
          applyExecutionPlan(
            Array.isArray(executionPlan) && executionPlan.length > 0
              ? executionPlan
              : AGENT_ORDER,
          );
          setWorkflow(workflowId, title);
          addEvent({ type: "info", message: `Workflow started: ${title}` });
          break;
        }

        case "workflow:completed": {
          setCompleted();
          addEvent({ type: "success", message: "Workflow completed successfully" });
          // Flush all buffers
          for (const buffer of buffersRef.current.values()) buffer.flush();
          break;
        }

        case "workflow:failed": {
          const { error } = data.payload;
          setStatus("failed");
          addEvent({ type: "error", message: `Workflow failed: ${error}` });
          for (const buffer of buffersRef.current.values()) buffer.flush();
          break;
        }

        case "workflow:paused":
          setStatus("paused");
          addEvent({ type: "warning", message: "Workflow paused" });
          break;

        case "workflow:cancelled":
          setStatus("cancelled");
          addEvent({ type: "warning", message: "Workflow cancelled" });
          for (const buffer of buffersRef.current.values()) buffer.flush();
          // Reset any agents still running — the server won't send step:failed for cancelled agents
          for (const role of AGENT_ORDER) {
            if (useAgentStore.getState().agents[role].status === "running") {
              setAgentFailed(role, "Cancelled");
            }
          }
          break;

        case "step:started": {
          const { role } = data.payload as { role: AgentRole };
          const stage = getStageForRole(role);
          const currentRetry = useAgentStore.getState().agents[role].retryCount;
          setCurrentStage(stage.index);
          setAgentStarted(role);
          const retryLabel = currentRetry > 0 ? ` (retry ${currentRetry})` : "";
          addEvent({
            type: "info",
            role,
            message: `${AGENT_CONFIG[role].label} agent started${retryLabel}`,
          });
          break;
        }

        case "step:stream": {
          const { role, chunk } = data.payload as {
            role: AgentRole;
            chunk: string;
          };
          const buffer = getOrCreateBuffer(role);
          buffer.push(chunk);
          break;
        }

        case "step:completed": {
          const { role, output, durationMs, tokensIn, tokensOut } =
            data.payload as {
              role: AgentRole;
              output: string;
              durationMs: number;
              tokensIn?: number;
              tokensOut?: number;
            };
          // Flush buffer first
          const buffer = buffersRef.current.get(role);
          if (buffer) buffer.flush();
          setAgentCompleted(role, output, durationMs, tokensIn, tokensOut);
          addEvent({
            type: "success",
            role,
            message: `${AGENT_CONFIG[role].label} agent completed in ${(durationMs / 1000).toFixed(1)}s`,
          });
          break;
        }

        case "step:failed": {
          const { role, error } = data.payload as {
            role: AgentRole;
            error: string;
          };
          const buffer = buffersRef.current.get(role);
          if (buffer) buffer.flush();
          setAgentFailed(role, error);
          addEvent({
            type: "error",
            role,
            message: `${AGENT_CONFIG[role].label} agent failed: ${error}`,
          });
          break;
        }

        case "step:activity": {
          const { role, activity } = data.payload as {
            role: AgentRole;
            activity: import("@/lib/workflow/types").AgentActivity;
          };
          setAgentActivity(role, activity);
          break;
        }

        case "step:retry": {
          const { role, attempt, maxRetries, reason } = data.payload as {
            role: AgentRole;
            attempt: number;
            maxRetries: number;
            reason: string;
          };
          setAgentRetry(role, attempt);
          addEvent({
            type: "warning",
            role,
            message: `${AGENT_CONFIG[role].label} agent retrying (${attempt}/${maxRetries}): ${reason}`,
          });
          break;
        }

        case "terminal:created": {
          const { terminalId } = data.payload;
          setTerminalId(terminalId);
          break;
        }

        case "terminal:output": {
          const terminalId = data.payload.terminalId;
          const output = data.payload.data;
          window.dispatchEvent(
            new CustomEvent("terminal:output", {
              detail: { terminalId, data: output },
            })
          );
          break;
        }

        case "terminal:error": {
          const { error } = data.payload;
          window.dispatchEvent(
            new CustomEvent("terminal:error", {
              detail: { error },
            })
          );
          break;
        }

        case "terminal:closed":
          setTerminalId(null);
          break;
      }
    },
    [
      setWorkflow,
      setStatus,
      setCurrentStage,
      setCompleted,
      applyExecutionPlan,
      setAgentStarted,
      setAgentCompleted,
      setAgentFailed,
      setAgentActivity,
      setAgentRetry,
      addEvent,
      setTerminalId,
      getOrCreateBuffer,
    ]
  );

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      reconnectAttempt.current = 0;
      setConnected(true);
      addEvent({ type: "info", message: "Connected to server" });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (err) {
        console.error("[WS] Parse error:", err);
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      setConnected(false);
      wsRef.current = null;

      if (!allowReconnectRef.current) return;

      // Auto-reconnect with backoff
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
        ];
      reconnectAttempt.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };
  }, [handleMessage, setConnected, addEvent]);

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    allowReconnectRef.current = true;
    connect();
    // Ping every 30s
    const pingInterval = setInterval(() => {
      send({ type: "ping" });
    }, 30000);

    return () => {
      allowReconnectRef.current = false;
      clearInterval(pingInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

      // Route transition unmount: close socket; terminal id is intentionally
      // preserved so next dashboard mount can attach back to same PTY session.
      setConnected(false);

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      for (const buffer of buffersRef.current.values()) buffer.destroy();
      buffersRef.current.clear();
    };
  }, [connect, send, setConnected]);

  return { send, wsRef };
}
