"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentRole } from "@/lib/workflow/types";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PipelineBar } from "@/components/pipeline/PipelineBar";
import { AgentCardGrid } from "@/components/agent/AgentCardGrid";
import { EventLog } from "@/components/events/EventLog";
import { TerminalPanel } from "@/components/terminal/TerminalPanel";
import { WorkflowLauncher } from "@/components/workflow/WorkflowLauncher";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useUiStore } from "@/stores/uiStore";

export default function DashboardPage() {
  const { send } = useWebSocket();
  const [promptFromUrl, setPromptFromUrl] = useState("");
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const { bottomPanelHeight, terminalVisible, eventLogVisible } = useUiStore();
  const resizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("prompt") || "";
    setPromptFromUrl(raw);
  }, []);

  const handleStart = useCallback(
    (prompt: string, executionPlan: AgentRole[]) => {
      send({
        type: "workflow:start",
        payload: { prompt, projectPath: "", executionPlan },
      });
    },
    [send]
  );

  const handlePause = useCallback(() => {
    if (workflowId) {
      send({ type: "workflow:pause", payload: { workflowId } });
    }
  }, [send, workflowId]);

  const handleResume = useCallback(() => {
    if (workflowId) {
      send({ type: "workflow:resume", payload: { workflowId } });
    }
  }, [send, workflowId]);

  const handleCancel = useCallback(() => {
    if (workflowId) {
      send({ type: "workflow:cancel", payload: { workflowId } });
    }
  }, [send, workflowId]);

  // Resizable handle for bottom panel
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      resizing.current = true;
      startY.current = e.clientY;
      startHeight.current = bottomPanelHeight;

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizing.current) return;
        const delta = startY.current - e.clientY;
        const newHeight = Math.max(100, Math.min(600, startHeight.current + delta));
        useUiStore.getState().setBottomPanelHeight(newHeight);
      };

      const handleMouseUp = () => {
        resizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bottomPanelHeight]
  );

  return (
    <DashboardShell>
      <WorkflowLauncher
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        initialPrompt={promptFromUrl}
      />
      <PipelineBar />

      {/* Agent Cards */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AgentCardGrid />
      </div>

      {/* Resizable handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 bg-border hover:bg-primary/50 cursor-row-resize flex-shrink-0 transition-colors"
      />

      {/* Bottom panels */}
      <div
        className="flex-shrink-0 flex overflow-hidden"
        style={{ height: bottomPanelHeight }}
      >
        {eventLogVisible && (
          <div className={`${terminalVisible ? "w-1/2 border-r border-border" : "w-full"} overflow-hidden`}>
            <EventLog />
          </div>
        )}
        {terminalVisible && (
          <div className={`${eventLogVisible ? "w-1/2" : "w-full"} overflow-hidden`}>
            <TerminalPanel send={send} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
