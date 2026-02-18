import { type AgentRole, AGENT_ORDER, normalizeExecutionPlan, type WorkflowStatus, type StepStatus } from './types.ts';

export interface PipelineState {
  workflowId: string;
  status: WorkflowStatus;
  currentStageIndex: number;
  steps: PipelineStepState[];
}

export interface PipelineStepState {
  role: AgentRole;
  status: StepStatus;
  retryCount: number;
}

export function createPipelineState(workflowId: string, executionPlan?: AgentRole[]): PipelineState {
  const selected = new Set(normalizeExecutionPlan(executionPlan));

  return {
    workflowId,
    status: 'pending',
    currentStageIndex: 0,
    steps: AGENT_ORDER.map((role) => ({
      role,
      status: selected.has(role) ? 'pending' : 'skipped',
      retryCount: 0,
    })),
  };
}

