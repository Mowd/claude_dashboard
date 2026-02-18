"use client";

import type { StepStatus } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

const statusConfig: Record<StepStatus, { key: string; className: string }> = {
  pending: { key: "status.pending", className: "bg-gray-500/20 text-gray-400" },
  running: { key: "status.running", className: "bg-emerald-500/20 text-emerald-400 animate-pulse" },
  completed: { key: "status.completed", className: "bg-blue-500/20 text-blue-400" },
  failed: { key: "status.failed", className: "bg-red-500/20 text-red-400" },
  skipped: { key: "status.skipped", className: "bg-gray-500/20 text-gray-500" },
};

export function AgentStatusBadge({ status }: { status: StepStatus }) {
  const config = statusConfig[status];
  const { t } = useI18n();

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.className}`}>
      {t(config.key)}
    </span>
  );
}
