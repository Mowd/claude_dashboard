"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { AgentStep, Workflow } from "@/lib/workflow/types";

interface WorkflowDetailResponse {
  workflow: Workflow;
  steps: AgentStep[];
}

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

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

  return (
    <DashboardShell>
      <div className="p-4 space-y-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Workflow Detail</h2>
          <Link href="/history" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to History
          </Link>
        </div>

        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {error && <div className="text-sm text-red-400">Failed to load: {error}</div>}

        {data && (
          <>
            <div className="rounded-md border border-border p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">Title:</span> {data.workflow.title}</div>
              <div><span className="text-muted-foreground">Status:</span> {data.workflow.status}</div>
              <div><span className="text-muted-foreground">Created:</span> {new Date(data.workflow.createdAt).toLocaleString()}</div>
              <div><span className="text-muted-foreground">Completed:</span> {data.workflow.completedAt ? new Date(data.workflow.completedAt).toLocaleString() : "-"}</div>
            </div>

            <div className="space-y-3">
              {data.steps.map((step) => (
                <div key={step.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium uppercase">{step.role}</div>
                    <div className="text-xs text-muted-foreground">
                      {step.status} · {step.durationMs != null ? `${step.durationMs}ms` : "-"} · in:{" "}
                      {step.tokensIn ?? "-"} out: {step.tokensOut ?? "-"}
                    </div>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground bg-black/20 rounded p-2 max-h-72 overflow-auto">
                    {step.output || "(no output)"}
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
