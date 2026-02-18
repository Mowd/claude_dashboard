"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { HistoryTable } from "@/components/history/HistoryTable";

export default function HistoryPage() {
  return (
    <DashboardShell>
      <div className="h-full overflow-auto p-4">
        <h2 className="text-lg font-semibold mb-4">Workflow History</h2>
        <HistoryTable />
      </div>
    </DashboardShell>
  );
}
