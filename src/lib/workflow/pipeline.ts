import { AgentRole, AGENT_ORDER, WorkflowStatus, StepStatus } from './types';

export interface PipelineState {
  workflowId: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  steps: PipelineStepState[];
}

export interface PipelineStepState {
  role: AgentRole;
  status: StepStatus;
  retryCount: number;
}

export function createPipelineState(workflowId: string): PipelineState {
  return {
    workflowId,
    status: 'pending',
    currentStepIndex: 0,
    steps: AGENT_ORDER.map((role) => ({
      role,
      status: 'pending',
      retryCount: 0,
    })),
  };
}

