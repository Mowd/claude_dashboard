"use client";

import { useEffect, useState } from "react";
import type { Workflow } from "@/lib/workflow/types";

const statusColors: Record<string, string> = {
  pending: "text-gray-400",
  running: "text-emerald-400",
  paused: "text-yellow-400",
  completed: "text-blue-400",
  failed: "text-red-400",
  cancelled: "text-gray-500",
};

export function HistoryTable() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workflows")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setWorkflows(data.workflows || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load workflows");
        setLoading(false);
      });
  }, []);

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

  if (workflows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        No workflows yet. Start one from the Dashboard.
      </div>
    );
  }

  return (
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
            <tr
              key={w.id}
              className="border-b border-border/50 hover:bg-white/5 cursor-pointer"
            >
              <td className="py-2 px-3 truncate max-w-[400px]">{w.title}</td>
              <td className={`py-2 px-3 ${statusColors[w.status] || ""}`}>
                {w.status}
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {new Date(w.createdAt).toLocaleString()}
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {w.completedAt
                  ? formatDuration(
                      new Date(w.completedAt).getTime() -
                        new Date(w.createdAt).getTime()
                    )
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
