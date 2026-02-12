"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import type { AgentActivity } from "@/lib/workflow/types";

function ActivityIndicator({ activity }: { activity: AgentActivity }) {
  switch (activity.kind) {
    case "thinking":
      return (
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
          Thinking...
        </span>
      );
    case "tool_use":
      return (
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          Using {activity.toolName}...
        </span>
      );
    case "text":
      return (
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Writing response...
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
          Waiting for output...
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

  if (!output) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-muted-foreground">
        {isStreaming ? (
          <ActivityIndicator activity={activity ?? { kind: "idle" }} />
        ) : (
          "No output yet"
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
