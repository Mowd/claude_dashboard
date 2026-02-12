"use client";

import { create } from "zustand";
import type { EventLogItem } from "@/types";

const MAX_EVENTS = 5000;

interface EventStoreState {
  events: EventLogItem[];
  addEvent: (event: Omit<EventLogItem, "id" | "timestamp">) => void;
  clear: () => void;
}

let eventCounter = 0;

export const useEventStore = create<EventStoreState>((set) => ({
  events: [],

  addEvent: (event) =>
    set((state) => {
      const newEvent: EventLogItem = {
        ...event,
        id: `evt-${++eventCounter}`,
        timestamp: new Date().toISOString(),
      };
      const events = [...state.events, newEvent];
      // Trim if over max
      if (events.length > MAX_EVENTS) {
        return { events: events.slice(-MAX_EVENTS) };
      }
      return { events };
    }),

  clear: () => set({ events: [] }),
}));
