"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface TerminalStoreState {
  terminalId: string | null;
  connected: boolean;
  setTerminalId: (id: string | null) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useTerminalStore = create<TerminalStoreState>()(
  persist(
    (set) => ({
      terminalId: null,
      connected: false,

      setTerminalId: (id) => set({ terminalId: id }),
      setConnected: (connected) => set({ connected }),
      reset: () => set({ terminalId: null, connected: false }),
    }),
    {
      name: "claude-dashboard-terminal",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ terminalId: state.terminalId }),
    }
  )
);
