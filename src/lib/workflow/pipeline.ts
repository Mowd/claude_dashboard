import { type AgentRole, AGENT_ORDER, type WorkflowStatus, type StepStatus } from './types.ts';

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

export function createPipelineState(workflowId: string): PipelineState {
  return {
    workflowId,
    status: 'pending',
    currentStageIndex: 0,
    steps: AGENT_ORDER.map((role) => ({
      role,
      status: 'pending',
      retryCount: 0,
    })),
  };
}

