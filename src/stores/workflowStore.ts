"use client";

import { create } from "zustand";
import type { WorkflowStatus } from "@/lib/workflow/types";

export interface WorkflowState {
  workflowId: string | null;
  status: WorkflowStatus;
  title: string;
  currentStageIndex: number;
  startedAt: number | null;
  completedAt: number | null;

  setWorkflow: (id: string, title: string) => void;
  setStatus: (status: WorkflowStatus) => void;
  setCurrentStage: (index: number) => void;
  setCompleted: () => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  status: "pending",
  title: "",
  currentStageIndex: 0,
  startedAt: null,
  completedAt: null,

  setWorkflow: (id, title) =>
    set({
      workflowId: id,
      title,
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      currentStageIndex: 0,
    }),

  setStatus: (status) => {
    const isTerminal = status === "completed" || status === "failed" || status === "cancelled";
    set(isTerminal ? { status, completedAt: Date.now() } : { status });
  },

  setCurrentStage: (index) => set({ currentStageIndex: index }),

  setCompleted: () => set({ status: "completed", completedAt: Date.now() }),

  reset: () =>
    set({
      workflowId: null,
      status: "pending",
      title: "",
      currentStageIndex: 0,
      startedAt: null,
      completedAt: null,
    }),
}));
