"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import type { AgentActivity } from "@/lib/workflow/types";
import { useI18n } from "@/lib/i18n/useI18n";

function ActivityIndicator({
  activity,
  t,
}: {
  activity: AgentActivity;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  switch (activity.kind) {
    case "thinking":
      return (
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          {t("agent.activity.thinking")}
        </span>
      );
    case "tool_use":
      return (
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          {t("agent.activity.toolUse", { tool: activity.toolName })}
        </span>
      );
    case "text":
      return (
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          {t("agent.activity.writing")}
        </span>
      );
    case "idle":
    default:
      return (
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {t("agent.activity.waiting")}
        </span>
      );
  }
}

interface AgentOutputProps {
  output: string;
  isStreaming: boolean;
  activity?: AgentActivity;
}

export function AgentOutput({
  output,
  isStreaming,
  activity,
}: AgentOutputProps) {
  const { ref, handleScroll } = useAutoScroll<HTMLDivElement>([output]);
  const { t } = useI18n();

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-muted-foreground">
        {isStreaming ? (
          <ActivityIndicator activity={activity ?? { kind: "idle" }} t={t} />
        ) : (
          t("agent.output.none")
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="agent-output overflow-y-auto h-full px-2 py-1"
    >
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
      </div>
      {isStreaming && (
        <span className="inline-block w-1.5 h-3 bg-emerald-400 animate-pulse ml-0.5" />
      )}
    </div>
  );
}
