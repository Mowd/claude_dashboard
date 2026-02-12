"use client";

import { create } from "zustand";
import type { WorkflowStatus } from "@/lib/workflow/types";

export interface WorkflowState {
  workflowId: string | null;
  status: WorkflowStatus;
  title: string;
  currentStepIndex: number;
  startedAt: number | null;
  completedAt: number | null;

  setWorkflow: (id: string, title: string) => void;
  setStatus: (status: WorkflowStatus) => void;
  setCurrentStep: (index: number) => void;
  setCompleted: () => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  status: "pending",
  title: "",
  currentStepIndex: 0,
  startedAt: null,
  completedAt: null,

  setWorkflow: (id, title) =>
    set({
      workflowId: id,
      title,
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      currentStepIndex: 0,
    }),

  setStatus: (status) => {
    const isTerminal = status === "completed" || status === "failed" || status === "cancelled";
    set(isTerminal ? { status, completedAt: Date.now() } : { status });
  },

  setCurrentStep: (index) => set({ currentStepIndex: index }),

  setCompleted: () => set({ status: "completed", completedAt: Date.now() }),

  reset: () =>
    set({
      workflowId: null,
      status: "pending",
      title: "",
      currentStepIndex: 0,
      startedAt: null,
      completedAt: null,
    }),
}));
