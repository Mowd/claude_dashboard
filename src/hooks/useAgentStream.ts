"use client";

import { useMemo } from "react";
import { useAgentStore } from "@/stores/agentStore";
import type { AgentRole } from "@/lib/workflow/types";

export function useAgentStream(role: AgentRole) {
  const agent = useAgentStore((s) => s.agents[role]);

  const output = useMemo(() => {
    return agent.outputChunks.join("");
  }, [agent.outputChunks]);

  return {
    status: agent.status,
    output,
    error: agent.error,
    startedAt: agent.startedAt,
    completedAt: agent.completedAt,
    durationMs: agent.durationMs,
    tokensIn: agent.tokensIn,
    tokensOut: agent.tokensOut,
    activity: agent.activity,
    lastActivityAt: agent.lastActivityAt,
    retryCount: agent.retryCount,
  };
}
