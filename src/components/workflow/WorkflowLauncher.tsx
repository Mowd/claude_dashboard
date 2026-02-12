"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { useEventStore } from "@/stores/eventStore";

interface WorkflowLauncherProps {
  onStart: (prompt: string) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function WorkflowLauncher({
  onStart,
  onPause,
  onResume,
  onCancel,
}: WorkflowLauncherProps) {
  const [prompt, setPrompt] = useState("");
  const { status, workflowId } = useWorkflowStore();
  const resetAgents = useAgentStore((s) => s.resetAll);
  const clearEvents = useEventStore((s) => s.clear);
  const resetWorkflow = useWorkflowStore((s) => s.reset);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;
      resetWorkflow();
      resetAgents();
      clearEvents();
      onStart(prompt.trim());
    },
    [prompt, onStart, resetWorkflow, resetAgents, clearEvents]
  );

  const isIdle = status === "pending" || status === "completed" || status === "failed" || status === "cancelled";
  const isRunning = status === "running";
  const isPaused = status === "paused";

  return (
    <div className="border-b border-border bg-card/50 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your development task..."
          disabled={!isIdle}
          className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        {isIdle && (
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start
          </button>
        )}
        {isRunning && (
          <>
            <button
              type="button"
              onClick={onPause}
              className="h-9 px-4 rounded-md bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Cancel
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button
              type="button"
              onClick={onResume}
              className="h-9 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Cancel
            </button>
          </>
        )}
      </form>
    </div>
  );
}
