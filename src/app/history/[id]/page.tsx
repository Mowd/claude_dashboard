"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { AgentStep, Workflow } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

interface WorkflowDetailResponse {
  workflow: Workflow;
  steps: AgentStep[];
}

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t, locale } = useI18n();

  const [data, setData] = useState<WorkflowDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/workflows/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<WorkflowDetailResponse>;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load workflow");
        setLoading(false);
      });
  }, [id]);

  const artifactPaths = useMemo(() => {
    if (!data) return [];
    return extractArtifactPaths(data.steps);
  }, [data]);

  return (
    <DashboardShell>
      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("historyDetail.title")}</h2>
          <Link href="/history" className="text-xs text-muted-foreground hover:text-foreground">
            {t("historyDetail.back")}
          </Link>
        </div>

        {loading && <div className="text-sm text-muted-foreground">{t("historyDetail.loading")}</div>}
        {error && <div className="text-sm text-red-400">{t("historyDetail.loadFailed", { error })}</div>}

        {data && (
          <>
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">{t("historyDetail.meta.title")}</span> {data.workflow.title}</div>
              <div><span className="text-muted-foreground">{t("historyDetail.meta.status")}</span> {t(`status.${data.workflow.status}`)}</div>
              <div><span className="text-muted-foreground">{t("historyDetail.meta.created")}</span> {new Date(data.workflow.createdAt).toLocaleString(locale)}</div>
              <div><span className="text-muted-foreground">{t("historyDetail.meta.completed")}</span> {data.workflow.completedAt ? new Date(data.workflow.completedAt).toLocaleString(locale) : "-"}</div>
              <div className="pt-1">
                <Link
                  href={`/?prompt=${encodeURIComponent(`Continue this previous task with fixes/improvements: ${data.workflow.userPrompt}`)}`}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  {t("historyDetail.retryWorkflow")}
                </Link>
              </div>
            </div>

            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-medium mb-2">{t("historyDetail.artifacts.title")}</div>
              {artifactPaths.length === 0 ? (
                <div className="text-xs text-muted-foreground">{t("historyDetail.artifacts.empty")}</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {artifactPaths.map((p) => (
                    <span key={p} className="text-xs rounded border border-border px-2 py-1 text-muted-foreground">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {data.steps.map((step) => (
                <div key={step.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium uppercase">{step.role}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`status.${step.status}`)} · {step.durationMs != null ? `${step.durationMs}ms` : "-"} · {t("historyDetail.step.in")}:{" "}
                      {step.tokensIn ?? "-"} {t("historyDetail.step.out")}: {step.tokensOut ?? "-"}
                    </div>
                  </div>
                  <div className="mb-2">
                    <Link
                      href={`/?prompt=${encodeURIComponent(`Retry from ${step.role.toUpperCase()} stage. Original task: ${data.workflow.userPrompt}\n\nPrevious ${step.role.toUpperCase()} output:\n${step.output || t("historyDetail.step.noOutput")}`)}`}
                      className="text-xs text-emerald-400 hover:underline"
                    >
                      {t("historyDetail.step.retry")}
                    </Link>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground bg-black/20 rounded p-2 max-h-72 overflow-auto">
                    {step.output || t("historyDetail.step.noOutput")}
                  </pre>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function extractArtifactPaths(steps: AgentStep[]): string[] {
  const pathRegex = /(?:^|\s)([\w./-]+\.(?:ts|tsx|js|jsx|json|md|yml|yaml|css|sql))/g;
  const found = new Set<string>();

  for (const step of steps) {
    const output = step.output || "";
    let match: RegExpExecArray | null;
    while ((match = pathRegex.exec(output)) !== null) {
      const candidate = match[1].trim();
      if (candidate.includes("/") || candidate.includes(".")) {
        found.add(candidate);
      }
    }
  }

  return Array.from(found).slice(0, 30);
}
