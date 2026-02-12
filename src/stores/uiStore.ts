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
        set((state) => ({ terminalVisible: !state.terminalVisible })),
      toggleEventLog: () =>
        set((state) => ({ eventLogVisible: !state.eventLogVisible })),
    }),
    {
      name: "claude-dashboard-ui",
    }
  )
);
