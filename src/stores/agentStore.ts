"use client";

import { create } from "zustand";
import type { AgentRole, StepStatus, AgentActivity } from "@/lib/workflow/types";
import { AGENT_ORDER } from "@/lib/workflow/types";

export interface AgentState {
  role: AgentRole;
  status: StepStatus;
  outputChunks: string[];
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  activity: AgentActivity;
  lastActivityAt: number | null;
  retryCount: number;
}

interface AgentStoreState {
  agents: Record<AgentRole, AgentState>;
  applyExecutionPlan: (roles: AgentRole[]) => void;
  appendChunks: (role: AgentRole, chunks: string[]) => void;
  setAgentStatus: (role: AgentRole, status: StepStatus) => void;
  setAgentStarted: (role: AgentRole) => void;
  setAgentCompleted: (
    role: AgentRole,
    output: string,
    durationMs: number,
    tokensIn?: number,
    tokensOut?: number
  ) => void;
  setAgentFailed: (role: AgentRole, error: string) => void;
  setAgentActivity: (role: AgentRole, activity: AgentActivity) => void;
  setAgentRetry: (role: AgentRole, attempt: number) => void;
  resetAll: () => void;
}

function createInitialAgents(): Record<AgentRole, AgentState> {
  const agents = {} as Record<AgentRole, AgentState>;
  for (const role of AGENT_ORDER) {
    agents[role] = {
      role,
      status: "pending",
      outputChunks: [],
      error: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
      tokensIn: null,
      tokensOut: null,
      activity: { kind: "idle" },
      lastActivityAt: null,
      retryCount: 0,
    };
  }
  return agents;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: createInitialAgents(),

  applyExecutionPlan: (roles) =>
    set(() => {
      const selected = new Set(roles);
      const base = createInitialAgents();
      for (const role of AGENT_ORDER) {
        if (!selected.has(role)) {
          base[role].status = "skipped";
        }
      }
      return { agents: base };
    }),

  appendChunks: (role, chunks) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: {
          ...state.agents[role],
          outputChunks: [...state.agents[role].outputChunks, ...chunks],
        },
      },
    })),

  setAgentStatus: (role, status) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: { ...state.agents[role], status },
      },
    })),

  setAgentStarted: (role) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: {
          ...state.agents[role],
          status: "running",
          startedAt: Date.now(),
          outputChunks: [],
          error: null,
          activity: { kind: "idle" },
          lastActivityAt: null,
          // retryCount is preserved — it's set by setAgentRetry before restart
        },
      },
    })),

  setAgentCompleted: (role, output, durationMs, tokensIn, tokensOut) =>
    set((state) => {
      const existing = state.agents[role];
      const finalChunks = output ? [output] : existing.outputChunks;
      return {
        agents: {
          ...state.agents,
          [role]: {
            ...existing,
            status: "completed",
            completedAt: Date.now(),
            durationMs,
            tokensIn: tokensIn ?? null,
            tokensOut: tokensOut ?? null,
            outputChunks: finalChunks,
          },
        },
      };
    }),

  setAgentFailed: (role, error) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: {
          ...state.agents[role],
          status: "failed",
          error,
          completedAt: Date.now(),
        },
      },
    })),

  setAgentActivity: (role, activity) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: {
          ...state.agents[role],
          activity,
          lastActivityAt: Date.now(),
        },
      },
    })),

  setAgentRetry: (role, attempt) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [role]: {
          ...state.agents[role],
          retryCount: attempt,
        },
      },
    })),

  resetAll: () => set({ agents: createInitialAgents() }),
}));
