"use client";

import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { PIPELINE_STAGES } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { PipelineNode } from "./PipelineNode";
import { useI18n } from "@/lib/i18n/useI18n";

export function PipelineBar() {
  const { currentStageIndex, status } = useWorkflowStore();
  const agents = useAgentStore((s) => s.agents);
  const { t } = useI18n();

  return (
    <div className="h-10 border-b border-border bg-card/50 flex items-center px-4 gap-1">
      {PIPELINE_STAGES.map((stage, stageIdx) => (
        <div key={stage.index} className="flex items-center">
          {stageIdx > 0 && (
            <div className="w-6 h-px bg-border mx-1" />
          )}
          {stage.roles.length > 1 ? (
            /* Multi-agent stage: group with a border */
            <div className="flex items-center border border-border/50 rounded-lg px-1 gap-0.5">
              {stage.roles.map((role, roleIdx) => (
                <div key={role} className="flex items-center">
                  {roleIdx > 0 && (
                    <div className="w-px h-4 bg-border mx-0.5" />
                  )}
                  <PipelineNode
                    role={role}
                    status={agents[role].status}
                    isCurrent={stageIdx === currentStageIndex && status === "running"}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Single-agent stage */
            <PipelineNode
              role={stage.roles[0]}
              status={agents[stage.roles[0]].status}
              isCurrent={stageIdx === currentStageIndex && status === "running"}
            />
          )}
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
        {t("pipeline.done")}
      </div>
    </div>
  );
}
