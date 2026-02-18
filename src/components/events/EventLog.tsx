"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEventStore } from "@/stores/eventStore";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { EventLogItem } from "./EventLogItem";
import { useI18n } from "@/lib/i18n/useI18n";

export function EventLog() {
  const events = useEventStore((s) => s.events);
  const { t } = useI18n();
  const parentRef = useRef<HTMLDivElement>(null);
  const { ref: scrollRef, handleScroll } = useAutoScroll<HTMLDivElement>([
    events.length,
  ]);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-medium">{t("events.title")}</span>
        <span className="text-[10px] text-muted-foreground">
          {t("events.count", { count: events.length })}
        </span>
      </div>
      <div
        ref={(el) => {
          (parentRef as any).current = el;
          (scrollRef as any).current = el;
        }}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EventLogItem event={events[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
