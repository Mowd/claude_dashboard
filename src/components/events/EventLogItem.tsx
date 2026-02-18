"use client";

import type { EventLogItem as EventLogItemType } from "@/types";
import { AGENT_CONFIG } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

const typeStyles: Record<string, string> = {
  info: "text-gray-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  success: "text-emerald-400",
};

export function EventLogItem({ event }: { event: EventLogItemType }) {
  const { locale } = useI18n();
  const time = new Date(event.timestamp).toLocaleTimeString(locale, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const agentColor = event.role ? AGENT_CONFIG[event.role]?.color : undefined;

  return (
    <div className="flex items-start gap-2 px-3 py-1 text-xs hover:bg-white/5">
      <span className="text-muted-foreground shrink-0 font-mono">{time}</span>
      {event.role && (
        <span
          className="shrink-0 font-medium"
          style={{ color: agentColor }}
        >
          [{AGENT_CONFIG[event.role]?.label}]
        </span>
      )}
      <span className={typeStyles[event.type] || "text-gray-400"}>
        {event.message}
      </span>
    </div>
  );
}
