"use client";

import { cn } from "@/lib/utils";
import type { AgentRole, StepStatus } from "@/lib/workflow/types";
import { AGENT_CONFIG } from "@/lib/workflow/types";

interface PipelineNodeProps {
  role: AgentRole;
  status: StepStatus;
  isCurrent: boolean;
}

export function PipelineNode({ role, status, isCurrent }: PipelineNodeProps) {
  const config = AGENT_CONFIG[role];

  const statusStyles: Record<StepStatus, string> = {
    pending: "border-gray-600 bg-gray-800/50 text-gray-500",
    running:
      "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/20",
    completed: "border-blue-500 bg-blue-500/10 text-blue-400",
    failed: "border-red-500 bg-red-500/10 text-red-400",
    skipped: "border-gray-700 bg-gray-800/30 text-gray-600",
  };

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          "relative px-3 py-1.5 rounded-md border text-xs font-medium transition-all duration-300",
          statusStyles[status]
        )}
        style={{
          borderColor:
            status === "running" || status === "completed"
              ? config.color
              : undefined,
        }}
      >
        {status === "running" && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: config.color }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: config.color }}
            />
          </span>
        )}
        {config.label}
      </div>
    </div>
  );
}
