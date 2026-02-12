"use client";

import { useState, useEffect } from "react";
import { useAgentStream } from "@/hooks/useAgentStream";
import type { AgentRole } from "@/lib/workflow/types";
import { AGENT_CONFIG } from "@/lib/workflow/types";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { AgentOutput } from "./AgentOutput";

interface AgentCardProps {
  role: AgentRole;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function LiveTimer({ startedAt }: { startedAt: number | null }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return null;

  const elapsed = Math.floor((now - startedAt) / 1000);
  const display =
    elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <span className="text-[10px] text-muted-foreground tabular-nums">{display}</span>
  );
}

export function AgentCard({ role }: AgentCardProps) {
  const config = AGENT_CONFIG[role];
  const {
    status,
    output,
    error,
    durationMs,
    tokensIn,
    tokensOut,
    activity,
    startedAt,
    retryCount,
  } = useAgentStream(role);

  return (
    <div
      className="flex flex-col h-full rounded-lg border bg-[#1F2229] overflow-hidden"
      style={{
        borderColor:
          status === "running"
            ? config.color
            : status === "completed"
              ? `${config.color}40`
              : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs font-semibold">{config.label}</span>
          {retryCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
              retry {retryCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "running" ? (
            <LiveTimer startedAt={startedAt} />
          ) : (
            durationMs != null && (
              <span className="text-[10px] text-muted-foreground">
                {formatDuration(durationMs)}
              </span>
            )
          )}
          <AgentStatusBadge status={status} />
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {error ? (
          <div className="p-2 text-xs text-red-400">{error}</div>
        ) : (
          <AgentOutput
            output={output}
            isStreaming={status === "running"}
            activity={activity}
          />
        )}
      </div>

      {/* Footer stats */}
      {(tokensIn != null || tokensOut != null) && (
        <div className="px-3 py-1 border-t border-border flex gap-3 text-[10px] text-muted-foreground">
          {tokensIn != null && <span>In: {tokensIn.toLocaleString()}</span>}
          {tokensOut != null && <span>Out: {tokensOut.toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
