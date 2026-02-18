"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkflowStore } from "@/stores/workflowStore";
import { useAgentStore } from "@/stores/agentStore";
import { AGENT_ORDER } from "@/lib/workflow/types";
import { useUiStore } from "@/stores/uiStore";
import { UsageIndicator } from "@/components/layout/UsageIndicator";
import { useI18n } from "@/lib/i18n/useI18n";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/messages";
import { useI18nStore } from "@/stores/i18nStore";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function LiveElapsed({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {formatDuration(now - startedAt)}
    </span>
  );
}

export function TopNav() {
  const { status, title, startedAt, completedAt } = useWorkflowStore();
  const agents = useAgentStore((s) => s.agents);
  const { terminalVisible, eventLogVisible, toggleTerminal, toggleEventLog } = useUiStore();
  const { locale, t } = useI18n();
  const setLocale = useI18nStore((s) => s.setLocale);

  const completedCount = AGENT_ORDER.filter(
    (r) => agents[r].status === "completed"
  ).length;

  const statusColors: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400",
    running: "bg-emerald-500/20 text-emerald-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-blue-500/20 text-blue-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-400",
  };

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight whitespace-nowrap">
          {t("app.title")}
        </h1>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("nav.dashboard")}
        </Link>
        <Link
          href="/history"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("nav.history")}
        </Link>
        {title && (
          <span className="text-xs text-muted-foreground truncate max-w-[300px]">
            {title}
          </span>
        )}
        <div className="hidden md:block h-4 w-px bg-border" />
        <UsageIndicator />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground flex items-center gap-1">
          {t("nav.language")}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-6 rounded border border-border bg-background px-1 text-[10px]"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={toggleEventLog}
          className={`text-[10px] px-2 py-1 rounded border ${eventLogVisible ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}
          title={t("nav.toggleEvents")}
        >
          {t("nav.events")}
        </button>
        <button
          type="button"
          onClick={toggleTerminal}
          className={`text-[10px] px-2 py-1 rounded border ${terminalVisible ? "border-emerald-500/40 text-emerald-300" : "border-border text-muted-foreground"}`}
          title={t("nav.toggleTerminal")}
        >
          {t("nav.terminal")}
        </button>

        {status !== "pending" && (
          <>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || ""}`}
            >
              {t(`status.${status}`)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("nav.agentsProgress", {
                completed: completedCount,
                total: AGENT_ORDER.length,
              })}
            </span>
            {startedAt && (
              status === "running" || status === "paused"
                ? <LiveElapsed startedAt={startedAt} />
                : <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration((completedAt ?? Date.now()) - startedAt)}
                  </span>
            )}
          </>
        )}
      </div>
    </header>
  );
}
