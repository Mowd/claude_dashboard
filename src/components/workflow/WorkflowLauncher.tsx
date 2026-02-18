"use client";

import { useState, useCallback, useEffect, type FormEvent } from "react";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { useEventStore } from "@/stores/eventStore";
import { AGENT_ORDER, type AgentRole } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

interface WorkflowLauncherProps {
  onStart: (prompt: string, executionPlan: AgentRole[]) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  initialPrompt?: string;
}

const PROMPT_TEMPLATES = [
  {
    name: "Bugfix",
    text: "Fix the reported bug with root-cause analysis, minimal patch, and regression test.",
  },
  {
    name: "Feature",
    text: "Implement this feature end-to-end with tests and concise docs updates.",
  },
  {
    name: "Refactor",
    text: "Refactor for readability/maintainability without behavior changes; keep tests green.",
  },
  {
    name: "Performance",
    text: "Profile bottlenecks, optimize critical path, and show before/after metrics.",
  },
];

const FAST_PLAN: AgentRole[] = ["pm", "rd", "ui"];

type RunMode = "full" | "fast" | "custom";

interface ImpactPreview {
  impact: "low" | "medium" | "high";
  suggestedMode: RunMode;
  rationale: string;
}

export function WorkflowLauncher({
  onStart,
  onPause,
  onResume,
  onCancel,
  initialPrompt,
}: WorkflowLauncherProps) {
  const [prompt, setPrompt] = useState("");
  const [runMode, setRunMode] = useState<RunMode>("full");
  const [customSelection, setCustomSelection] = useState<AgentRole[]>(AGENT_ORDER);
  const [preview, setPreview] = useState<ImpactPreview | null>(null);
  const { status } = useWorkflowStore();
  const { t } = useI18n();
  const resetAgents = useAgentStore((s) => s.resetAll);
  const clearEvents = useEventStore((s) => s.clear);
  const resetWorkflow = useWorkflowStore((s) => s.reset);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setPrompt(initialPrompt.trim());
    }
  }, [initialPrompt]);

  useEffect(() => {
    setPreview(null);
  }, [prompt]);

  const selectedPlan =
    runMode === "full"
      ? AGENT_ORDER
      : runMode === "fast"
        ? FAST_PLAN
        : AGENT_ORDER.filter((role) => customSelection.includes(role));

  const handleToggleCustomRole = (role: AgentRole) => {
    setCustomSelection((prev) => {
      if (prev.includes(role)) {
        if (prev.length <= 1) return prev;
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;
      if (selectedPlan.length === 0) return;
      resetWorkflow();
      resetAgents();
      clearEvents();
      onStart(prompt.trim(), selectedPlan);
    },
    [prompt, selectedPlan, onStart, resetWorkflow, resetAgents, clearEvents]
  );

  const handlePreview = useCallback(() => {
    if (!prompt.trim()) return;
    setPreview(analyzePromptImpact(prompt, t));
  }, [prompt, t]);

  const applySuggestedMode = useCallback(() => {
    if (!preview) return;
    setRunMode(preview.suggestedMode);
  }, [preview]);

  const isIdle =
    status === "pending" ||
    status === "completed" ||
    status === "failed" ||
    status === "cancelled";
  const isRunning = status === "running";
  const isPaused = status === "paused";

  return (
    <div className="border-b border-border bg-card/50 px-4 py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("launcher.templates")}</span>
        {PROMPT_TEMPLATES.map((tpl) => (
          <button
            key={tpl.name}
            type="button"
            disabled={!isIdle}
            onClick={() => setPrompt(tpl.text)}
            className="h-7 px-2 rounded-md border border-border text-xs hover:bg-white/5 disabled:opacity-40"
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {isIdle && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">{t("launcher.runMode")}</span>
            <button
              type="button"
              onClick={() => setRunMode("full")}
              className={`h-7 rounded-md border px-2 ${runMode === "full" ? "border-emerald-500 text-emerald-400" : "border-border text-muted-foreground"}`}
            >
              {t("launcher.mode.full")}
            </button>
            <button
              type="button"
              onClick={() => setRunMode("fast")}
              className={`h-7 rounded-md border px-2 ${runMode === "fast" ? "border-yellow-500 text-yellow-400" : "border-border text-muted-foreground"}`}
            >
              {t("launcher.mode.fast")}
            </button>
            <button
              type="button"
              onClick={() => setRunMode("custom")}
              className={`h-7 rounded-md border px-2 ${runMode === "custom" ? "border-blue-500 text-blue-400" : "border-border text-muted-foreground"}`}
            >
              {t("launcher.mode.custom")}
            </button>
          </div>

          {runMode === "custom" && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {AGENT_ORDER.map((role) => {
                const checked = customSelection.includes(role);
                return (
                  <label key={role} className="inline-flex items-center gap-1 rounded border border-border px-2 py-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCustomRole(role)}
                    />
                    <span className="uppercase">{role}</span>
                  </label>
                );
              })}
            </div>
          )}

          {selectedPlan.length < AGENT_ORDER.length && (
            <div className="text-xs rounded-md border border-yellow-800/60 bg-yellow-900/20 px-2 py-1 text-yellow-300">
              {t("launcher.warning.skip", {
                roles: AGENT_ORDER.filter((role) => !selectedPlan.includes(role)).join(", ").toUpperCase(),
              })}
            </div>
          )}

          {preview && (
            <div className="rounded-md border border-border p-2 text-xs space-y-1">
              <div>
                {t("launcher.impact", { level: preview.impact })}{" "}
              </div>
              <div>
                {t("launcher.suggestedMode", { mode: preview.suggestedMode })}
              </div>
              <div className="text-muted-foreground">{preview.rationale}</div>
              <button
                type="button"
                onClick={applySuggestedMode}
                className="h-7 rounded-md border border-border px-2 hover:bg-white/5"
              >
                {t("launcher.applySuggestion")}
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("launcher.placeholder")}
          disabled={!isIdle}
          className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        {isIdle && (
          <>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!prompt.trim()}
              className="h-9 px-3 rounded-md border border-border text-xs hover:bg-white/5 disabled:opacity-50"
            >
              {t("launcher.preview")}
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || selectedPlan.length === 0}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("launcher.start")}
            </button>
          </>
        )}
        {isRunning && (
          <>
            <button
              type="button"
              onClick={onPause}
              className="h-9 px-4 rounded-md bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700"
            >
              {t("launcher.pause")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              {t("launcher.cancel")}
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
              {t("launcher.resume")}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              {t("launcher.cancel")}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

function analyzePromptImpact(
  prompt: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): ImpactPreview {
  const text = prompt.toLowerCase();
  const highRiskKeywords = ["auth", "payment", "security", "delete", "migration", "database", "permission"];
  const mediumRiskKeywords = ["api", "schema", "checkout", "order", "billing", "session"];

  const highHits = highRiskKeywords.filter((k) => text.includes(k)).length;
  const mediumHits = mediumRiskKeywords.filter((k) => text.includes(k)).length;

  if (highHits > 0) {
    return {
      impact: "high",
      suggestedMode: "full",
      rationale: t("launcher.impact.high.reason"),
    };
  }

  if (mediumHits > 1 || prompt.length > 180) {
    return {
      impact: "medium",
      suggestedMode: "custom",
      rationale: t("launcher.impact.medium.reason"),
    };
  }

  return {
    impact: "low",
    suggestedMode: "fast",
    rationale: t("launcher.impact.low.reason"),
  };
}
