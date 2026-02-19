"use client";

import { AGENT_ORDER } from "@/lib/workflow/types";
import { AgentCard } from "./AgentCard";

export function AgentCardGrid() {
  return (
    <div className="grid grid-cols-5 gap-2 p-2 h-full min-h-0 min-w-0 overflow-hidden">
      {AGENT_ORDER.map((role) => (
        <AgentCard key={role} role={role} />
      ))}
    </div>
  );
}
