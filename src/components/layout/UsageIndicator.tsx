"use client";

import { useUsage } from "@/hooks/useUsage";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/useI18n";

/**
 * Returns Tailwind color classes based on usage percentage thresholds.
 *  - < 50%  → emerald (normal)
 *  - 50-80% → yellow (warning)
 *  - > 80%  → red (danger)
 */
function getUsageColor(utilization: number | null | undefined): string {
  if (utilization == null) return "text-muted-foreground";
  if (utilization > 80) return "text-red-400";
  if (utilization >= 50) return "text-yellow-400";
  return "text-emerald-400";
}

/**
 * Formats a utilization number to a display string.
 * Returns "--" if the value is unavailable.
 */
function formatPercent(utilization: number | null | undefined): string {
  if (utilization == null) return "--";
  return `${Math.round(utilization)}%`;
}

/**
 * Formats an ISO 8601 date string into a localized reset time string.
 * Example: "2026-02-13 14:00"
 */
function formatResetTime(
  resetsAt: string | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!resetsAt) return fallback;
  try {
    const date = new Date(resetsAt);
    return date.toLocaleString(locale, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return fallback;
  }
}

/** Single usage metric item props */
interface UsageItemProps {
  label: string;
  utilization: number | null | undefined;
  resetsAt: string | null | undefined;
  tooltipLabel: string;
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

/**
 * A single usage metric with tooltip showing reset time.
 */
function UsageItem({ label, utilization, resetsAt, tooltipLabel, locale, t }: UsageItemProps) {
  const tooltipContent = (
    <div className="text-xs">
      <div className="font-medium mb-0.5">{tooltipLabel}</div>
      <div className="text-muted-foreground">
        {t("usage.tooltip.usage", { value: formatPercent(utilization) })}
      </div>
      <div className="text-muted-foreground">
        {t("usage.tooltip.resets", {
          value: formatResetTime(resetsAt, locale, t("usage.tooltip.na")),
        })}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} side="bottom" delayMs={150}>
      <span
        className={`${getUsageColor(utilization)} cursor-default`}
        aria-label={`${tooltipLabel}: ${formatPercent(utilization)}`}
      >
        {label}: {formatPercent(utilization)}
      </span>
    </Tooltip>
  );
}

/**
 * Compact usage indicator showing three Claude Code usage metrics
 * inline in the header. Designed to fit within h-12 without increasing height.
 *
 * Displays: Session | Week | Sonnet with color-coded percentages
 * and tooltips showing reset times on hover.
 */
export function UsageIndicator() {
  const { data, loading } = useUsage();
  const { locale, t } = useI18n();

  // Show subtle loading skeleton while fetching initial data
  if (loading) {
    return (
      <div
        className="hidden md:flex items-center gap-2 text-xs text-muted-foreground"
        aria-label={t("usage.loadingAria")}
      >
        <span className="animate-pulse opacity-50">{t("usage.session")}: --</span>
        <span className="text-border opacity-30">|</span>
        <span className="animate-pulse opacity-50">{t("usage.week")}: --</span>
        <span className="text-border opacity-30">|</span>
        <span className="animate-pulse opacity-50">{t("usage.sonnet")}: --</span>
      </div>
    );
  }

  const session = data?.five_hour?.utilization ?? null;
  const week = data?.seven_day?.utilization ?? null;
  const sonnet = data?.seven_day_sonnet?.utilization ?? null;

  // If there's an error and no data at all, show a subtle indicator
  if (data?.error && session == null && week == null && sonnet == null) {
    return (
      <Tooltip
        content={
          <div className="text-xs text-muted-foreground">
            {data.error}
          </div>
        }
        side="bottom"
      >
        <div
          className="hidden md:flex items-center gap-2 text-xs text-muted-foreground"
          aria-label={t("usage.unavailableAria")}
        >
          <span className="opacity-50">{t("usage.unavailable")}</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      className="hidden md:flex items-center gap-2 text-xs tabular-nums"
      role="status"
      aria-label="Claude Code usage metrics"
    >
      <UsageItem
        label={t("usage.session")}
        utilization={session}
        resetsAt={data?.five_hour?.resets_at}
        tooltipLabel={t("usage.tooltip.session")}
        locale={locale}
        t={t}
      />
      <span className="text-border select-none" aria-hidden="true">|</span>
      <UsageItem
        label={t("usage.week")}
        utilization={week}
        resetsAt={data?.seven_day?.resets_at}
        tooltipLabel={t("usage.tooltip.week")}
        locale={locale}
        t={t}
      />
      <span className="text-border select-none" aria-hidden="true">|</span>
      <UsageItem
        label={t("usage.sonnet")}
        utilization={sonnet}
        resetsAt={data?.seven_day_sonnet?.resets_at}
        tooltipLabel={t("usage.tooltip.sonnet")}
        locale={locale}
        t={t}
      />
    </div>
  );
}
