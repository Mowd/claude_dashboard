"use client";

import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { AGENT_ORDER } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { PipelineNode } from "./PipelineNode";

export function PipelineBar() {
  const { currentStepIndex, status } = useWorkflowStore();
  const agents = useAgentStore((s) => s.agents);

  return (
    <div className="h-10 border-b border-border bg-card/50 flex items-center px-4 gap-1">
      {AGENT_ORDER.map((role, idx) => (
        <div key={role} className="flex items-center">
          {idx > 0 && (
            <div className="w-6 h-px bg-border mx-1" />
          )}
          <PipelineNode
            role={role}
            status={agents[role].status}
            isCurrent={idx === currentStepIndex && status === "running"}
          />
        </div>
      ))}
      <div className="w-6 h-px bg-border mx-1" />
      <div
        className={cn(
          "px-3 py-1.5 rounded-md border text-xs font-medium",
          status === "completed"
            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            : "border-gray-600 bg-gray-800/50 text-gray-500"
        )}
      >
        Done
      </div>
    </div>
  );
}
