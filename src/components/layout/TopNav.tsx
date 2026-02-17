"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { AGENT_ORDER } from "@/lib/workflow/types";
import { UsageIndicator } from "@/components/layout/UsageIndicator";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function LiveElapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {formatDuration(now - startedAt)}
    </span>
  );
}

export function TopNav() {
  const { status, title, startedAt, completedAt } = useWorkflowStore();
  const agents = useAgentStore((s) => s.agents);

  const completedCount = AGENT_ORDER.filter(
    (r) => agents[r].status === "completed"
  ).length;

  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400",
    running: "bg-emerald-500/20 text-emerald-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-blue-500/20 text-blue-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight whitespace-nowrap">
          Claude Dashboard
        </h1>
        <Link
          href="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          History
        </Link>
        {title && (
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {title}
          </span>
        )}
        <div className="hidden md:block h-4 w-px bg-border" />
        <UsageIndicator />
      </div>

      <div className="flex items-center gap-3">
        {status !== "pending" && (
          <>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || ""}`}
            >
              {status.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{AGENT_ORDER.length} agents
            </span>
            {startedAt && (
              status === "running" || status === "paused"
                ? <LiveElapsed startedAt={startedAt} />
                : <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration((completedAt ?? Date.now()) - startedAt)}
                  </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
