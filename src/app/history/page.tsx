"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { HistoryTable } from "@/components/history/HistoryTable";
import { useI18n } from "@/lib/i18n/useI18n";

export default function HistoryPage() {
  const { t } = useI18n();

  return (
    <DashboardShell>
      <div className="h-full overflow-y-auto overflow-x-hidden p-4">
        <h2 className="text-lg font-semibold mb-4">{t("history.title")}</h2>
        <HistoryTable />
      </div>
    </DashboardShell>
  );
}
