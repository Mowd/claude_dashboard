"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTerminalStore } from "@/stores/terminalStore";
import type { XTermHandle } from "./XTermRenderer";

const XTermRenderer = dynamic(
  () =>
    import("./XTermRenderer").then((mod) => ({
      default: mod.XTermRenderer,
    })),
  { ssr: false }
);

interface TerminalPanelProps {
  send: (msg: object) => void;
}

export function TerminalPanel({ send }: TerminalPanelProps) {
  const { terminalId, connected } = useTerminalStore();
  const termRef = useRef<XTermHandle>(null);
  const [error, setError] = useState<string | null>(null);

  // Track terminalId via ref to avoid listener re-registration gaps
  const terminalIdRef = useRef<string | null>(terminalId);
  useEffect(() => { terminalIdRef.current = terminalId; }, [terminalId]);

  // Create (or recover) terminal session.
  // Retry periodically while connected but terminalId is still missing.
  useEffect(() => {
    if (!connected || terminalId) return;

    const create = () => {
      send({ type: "terminal:create", payload: { projectPath: "" } });
    };

    create();
    const retry = setInterval(create, 1500);

    return () => clearInterval(retry);
  }, [connected, terminalId, send]);

  // Listen for terminal output via CustomEvent — registered once, uses ref for terminalId.
  // Accept output when terminalIdRef is still null (terminal initializing) to avoid
  // dropping early output that arrives before the ref is synced from the store.
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (!terminalIdRef.current || e.detail.terminalId === terminalIdRef.current) {
        termRef.current?.write(e.detail.data);
      }
    };
    window.addEventListener("terminal:output" as any, handler);
    return () => window.removeEventListener("terminal:output" as any, handler);
  }, []);

  // Listen for terminal errors via CustomEvent
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setError(e.detail.error);
    };
    window.addEventListener("terminal:error" as any, handler);
    return () => window.removeEventListener("terminal:error" as any, handler);
  }, []);

  const handleData = useCallback(
    (data: string) => {
      if (terminalId) {
        send({
          type: "terminal:input",
          payload: { terminalId, data },
        });
      }
    },
    [terminalId, send]
  );

  const pendingSizeRef = useRef<{ cols: number; rows: number } | null>(null);

  useEffect(() => {
    if (terminalId) setError(null);
  }, [terminalId]);

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      if (terminalId) {
        send({
          type: "terminal:resize",
          payload: { terminalId, cols, rows },
        });
        pendingSizeRef.current = null;
      } else {
        // terminalId not yet available — stash for later
        pendingSizeRef.current = { cols, rows };
      }
    },
    [terminalId, send]
  );

  // Flush pending resize once terminalId becomes available
  useEffect(() => {
    if (terminalId && pendingSizeRef.current) {
      send({
        type: "terminal:resize",
        payload: { terminalId, ...pendingSizeRef.current },
      });
      pendingSizeRef.current = null;
    }
  }, [terminalId, send]);

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
        Connecting to server...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
          <span className="text-xs font-medium">Terminal</span>
          <span className="text-[10px] text-red-400">Error</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-xs font-medium">Terminal</span>
        <span className="text-[10px] text-muted-foreground">
          {terminalId ? "Connected" : "Initializing..."}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <XTermRenderer
          ref={termRef}
          onData={handleData}
          onResize={handleResize}
        />
      </div>
    </div>
  );
}
