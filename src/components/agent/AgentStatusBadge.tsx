"use client";

import type { StepStatus } from "@/lib/workflow/types";

const statusConfig: Record<StepStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-500/20 text-gray-400" },
  running: { label: "Running", className: "bg-emerald-500/20 text-emerald-400 animate-pulse" },
  completed: { label: "Done", className: "bg-blue-500/20 text-blue-400" },
  failed: { label: "Failed", className: "bg-red-500/20 text-red-400" },
  skipped: { label: "Skipped", className: "bg-gray-500/20 text-gray-500" },
};

export function AgentStatusBadge({ status }: { status: StepStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
