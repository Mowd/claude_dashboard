"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Workflow, WorkflowStatus } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

const statusColors: Record<string, string> = {
  pending: "text-gray-400",
  running: "text-emerald-400",
  paused: "text-yellow-400",
  completed: "text-blue-400",
  failed: "text-red-400",
  cancelled: "text-gray-500",
};

const PAGE_SIZE = 20;
const STATUSES: Array<"all" | WorkflowStatus> = [
  "all",
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "cancelled",
];

interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  limit: number;
  offset: number;
}

interface WorkflowMetricsResponse {
  workflowCount: number;
  completedCount: number;
  failedCount: number;
  avgWorkflowDurationMs: number;
  avgStepDurationMs: number;
  totalTokensIn: number;
  totalTokensOut: number;
}

export function HistoryTable() {
  const { t, locale } = useI18n();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | WorkflowStatus>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keepDays, setKeepDays] = useState(30);
  const [keepLatest, setKeepLatest] = useState(300);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [metrics, setMetrics] = useState<WorkflowMetricsResponse | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    const offset = (page - 1) * PAGE_SIZE;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    if (status !== "all") params.set("status", status);
    if (query.trim()) params.set("q", query.trim());

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/workflows?${params.toString()}`),
      fetch("/api/workflows/metrics"),
    ])
      .then(async ([listRes, metricsRes]) => {
        if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);
        const listJson = (await listRes.json()) as WorkflowListResponse;
        const metricsJson = metricsRes.ok
          ? ((await metricsRes.json()) as WorkflowMetricsResponse)
          : null;
        return { listJson, metricsJson };
      })
      .then(({ listJson, metricsJson }) => {
        setWorkflows(listJson.workflows || []);
        setTotal(listJson.total || 0);
        setMetrics(metricsJson);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load workflows");
        setLoading(false);
      });
  }, [page, query, status, refreshTick]);

  const handleApplySearch = () => {
    setPage(1);
    setQuery(queryInput);
  };

  const handleCleanup = async () => {
    const ok = window.confirm(
      t("history.cleanup.confirm", { keepDays, keepLatest }),
    );
    if (!ok) return;

    setCleanupMessage(null);

    const res = await fetch("/api/workflows/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepDays, keepLatest }),
    });

    const json = await res.json();
    if (!res.ok) {
      setCleanupMessage(json?.error || t("history.cleanup.failed"));
      return;
    }

    setCleanupMessage(t("history.cleanup.success", { count: json.deleted }));
    setPage(1);
    setRefreshTick((n) => n + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        {t("history.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-red-400">
        {t("history.loadFailed", { error })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "all" | WorkflowStatus);
            setPage(1);
          }}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? t("history.filters.allStatuses") : t(`status.${s}`)}
            </option>
          ))}
        </select>

        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder={t("history.filters.searchPlaceholder")}
          className="h-8 min-w-[240px] rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          onClick={handleApplySearch}
          className="h-8 rounded-md border border-border px-3 text-xs hover:bg-white/5"
        >
          {t("history.filters.search")}
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat label={t("history.metrics.workflows")} value={String(metrics.workflowCount)} />
          <Stat
            label={t("history.metrics.completedFailed")}
            value={`${metrics.completedCount} / ${metrics.failedCount}`}
          />
          <Stat label={t("history.metrics.avgWorkflow")} value={formatDuration(metrics.avgWorkflowDurationMs)} />
          <Stat label={t("history.metrics.avgStep")} value={formatDuration(metrics.avgStepDurationMs)} />
          <Stat label={t("history.metrics.tokensIn")} value={metrics.totalTokensIn.toLocaleString()} />
          <Stat label={t("history.metrics.tokensOut")} value={metrics.totalTokensOut.toLocaleString()} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border border-border rounded-md p-2">
        <span className="text-xs text-muted-foreground">{t("history.retention")}</span>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          {t("history.keepDays")}
          <input
            type="number"
            min={1}
            value={keepDays}
            onChange={(e) => setKeepDays(Math.max(1, Number(e.target.value) || 1))}
            className="h-7 w-20 rounded border border-border bg-background px-2"
          />
        </label>
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          {t("history.keepLatest")}
          <input
            type="number"
            min={1}
            value={keepLatest}
            onChange={(e) => setKeepLatest(Math.max(1, Number(e.target.value) || 1))}
            className="h-7 w-24 rounded border border-border bg-background px-2"
          />
        </label>
        <button
          onClick={handleCleanup}
          className="h-8 rounded-md border border-border px-3 text-xs hover:bg-white/5"
        >
          {t("history.runCleanup")}
        </button>
        {cleanupMessage && <span className="text-xs text-muted-foreground">{cleanupMessage}</span>}
      </div>

      {workflows.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          {t("history.empty")}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium">{t("history.table.title")}</th>
                <th className="text-left py-2 px-3 font-medium">{t("history.table.status")}</th>
                <th className="text-left py-2 px-3 font-medium">{t("history.table.created")}</th>
                <th className="text-left py-2 px-3 font-medium">{t("history.table.duration")}</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((w) => (
                <tr key={w.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="py-2 px-3 truncate max-w-[400px]">
                    <Link href={`/history/${w.id}`} className="hover:underline">
                      {w.title}
                    </Link>
                  </td>
                  <td className={`py-2 px-3 ${statusColors[w.status] || ""}`}>{t(`status.${w.status}`)}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {new Date(w.createdAt).toLocaleString(locale)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {w.completedAt
                      ? formatDuration(
                          new Date(w.completedAt).getTime() - new Date(w.createdAt).getTime(),
                        )
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("history.pagination.summary", { total, page, totalPages })}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-8 rounded-md border border-border px-3 disabled:opacity-40"
          >
            {t("history.pagination.prev")}
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-8 rounded-md border border-border px-3 disabled:opacity-40"
          >
            {t("history.pagination.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
