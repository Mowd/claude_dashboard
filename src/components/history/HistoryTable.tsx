"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Workflow, WorkflowStatus } from "@/lib/workflow/types";

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

export function HistoryTable() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | WorkflowStatus>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

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

    fetch(`/api/workflows?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<WorkflowListResponse>;
      })
      .then((data) => {
        setWorkflows(data.workflows || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load workflows");
        setLoading(false);
      });
  }, [page, query, status]);

  const handleApplySearch = () => {
    setPage(1);
    setQuery(queryInput);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-red-400">
        Failed to load workflows: {error}
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
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>

        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search title or prompt"
          className="h-8 min-w-[240px] rounded-md border border-border bg-background px-2 text-xs"
        />
        <button
          onClick={handleApplySearch}
          className="h-8 rounded-md border border-border px-3 text-xs hover:bg-white/5"
        >
          Search
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          No workflows found.
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium">Title</th>
                <th className="text-left py-2 px-3 font-medium">Status</th>
                <th className="text-left py-2 px-3 font-medium">Created</th>
                <th className="text-left py-2 px-3 font-medium">Duration</th>
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
                  <td className={`py-2 px-3 ${statusColors[w.status] || ""}`}>{w.status}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {new Date(w.createdAt).toLocaleString()}
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
          {total} total · page {page}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-8 rounded-md border border-border px-3 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-8 rounded-md border border-border px-3 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
