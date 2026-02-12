"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export interface XTermHandle {
  write: (data: string) => void;
  clear: () => void;
}

interface XTermRendererProps {
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

let Terminal: any;
let FitAddon: any;

export const XTermRenderer = forwardRef<XTermHandle, XTermRendererProps>(
  function XTermRenderer({ onData, onResize }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const initialized = useRef(false);

    // Refs to hold latest callbacks — avoids stale closures in xterm event handlers
    const onDataRef = useRef(onData);
    const onResizeRef = useRef(onResize);
    useEffect(() => { onDataRef.current = onData; }, [onData]);
    useEffect(() => { onResizeRef.current = onResize; }, [onResize]);

    const pendingWrites = useRef<string[]>([]);

    useImperativeHandle(ref, () => ({
      write(data: string) {
        if (termRef.current) {
          termRef.current.write(data);
        } else {
          pendingWrites.current.push(data);
        }
      },
      clear() {
        termRef.current?.clear();
      },
    }));

    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      if (initialized.current || !containerRef.current) return;
      initialized.current = true;
      let disposed = false;

      (async () => {
        // Dynamic imports (including xterm.css for proper rendering)
        const [xtermModule, fitModule] = await Promise.all([
          import("xterm"),
          import("xterm-addon-fit"),
          import("xterm/css/xterm.css"),
        ]);

        if (disposed) return;

        Terminal = xtermModule.Terminal;
        FitAddon = fitModule.FitAddon;

        const term = new Terminal({
          theme: {
            background: "#080808",
            foreground: "#e0e0e0",
            cursor: "#e0e0e0",
            selectionBackground: "#ffffff30",
          },
          fontSize: 13,
          fontFamily: '"SF Mono", Menlo, Monaco, "Courier New", monospace',
          cursorBlink: true,
          allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current!);
        fitAddon.fit();

        term.onData((data: string) => onDataRef.current(data));
        term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
          onResizeRef.current(cols, rows);
        });

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Flush any writes that arrived before xterm was ready
        for (const data of pendingWrites.current) {
          term.write(data);
        }
        pendingWrites.current = [];

        // Initial resize report
        onResizeRef.current(term.cols, term.rows);

        // ResizeObserver for container
        const observer = new ResizeObserver(() => {
          fitAddon.fit();
        });
        observer.observe(containerRef.current!);

        cleanupRef.current = () => {
          observer.disconnect();
          term.dispose();
        };
      })();

      return () => {
        disposed = true;
        initialized.current = false;  // Allow re-init after HMR
        termRef.current = null;       // Ensure writes go to pendingWrites until re-init
        cleanupRef.current?.();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className="terminal-container w-full h-full bg-[#080808]"
      />
    );
  }
);
