"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiStoreState {
  agentPanelHeight: number;
  bottomPanelHeight: number;
  terminalVisible: boolean;
  eventLogVisible: boolean;
  setAgentPanelHeight: (height: number) => void;
  setBottomPanelHeight: (height: number) => void;
  toggleTerminal: () => void;
  toggleEventLog: () => void;
  setTerminalVisible: (visible: boolean) => void;
  setEventLogVisible: (visible: boolean) => void;
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set) => ({
      agentPanelHeight: 400,
      bottomPanelHeight: 300,
      terminalVisible: true,
      eventLogVisible: true,
      setAgentPanelHeight: (height) => set({ agentPanelHeight: height }),
      setBottomPanelHeight: (height) => set({ bottomPanelHeight: height }),
      toggleTerminal: () =>
        set((state) => {
          const next = !state.terminalVisible;
          // Keep at least one bottom panel visible
          if (!next && !state.eventLogVisible) {
            return { terminalVisible: true, eventLogVisible: true };
          }
          return { terminalVisible: next };
        }),
      toggleEventLog: () =>
        set((state) => {
          const next = !state.eventLogVisible;
          // Keep at least one bottom panel visible
          if (!next && !state.terminalVisible) {
            return { terminalVisible: true, eventLogVisible: true };
          }
          return { eventLogVisible: next };
        }),
      setTerminalVisible: (visible) =>
        set((state) => {
          if (!visible && !state.eventLogVisible) {
            return { terminalVisible: true, eventLogVisible: true };
          }
          return { terminalVisible: visible };
        }),
      setEventLogVisible: (visible) =>
        set((state) => {
          if (!visible && !state.terminalVisible) {
            return { terminalVisible: true, eventLogVisible: true };
          }
          return { eventLogVisible: visible };
        }),
    }),
    {
      name: "claude-dashboard-ui",
    }
  )
);
