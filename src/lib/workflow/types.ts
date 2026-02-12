export type AgentRole = 'pm' | 'rd' | 'ui' | 'test' | 'sec';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface Workflow {
  id: string;
  title: string;
  userPrompt: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  projectPath: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface AgentStep {
  id: string;
  workflowId: string;
  role: AgentRole;
  status: StepStatus;
  prompt: string;
  output: string;
  error: string | null;
  retryCount: number;
  durationMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Pipeline stages — defines parallel execution groups
// ---------------------------------------------------------------------------

export interface PipelineStage {
  index: number;
  roles: AgentRole[];
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { index: 0, roles: ['pm'] },
  { index: 1, roles: ['rd', 'ui'] },
  { index: 2, roles: ['test', 'sec'] },
];

/** The fixed execution order for agents within a workflow (derived from stages). */
export const AGENT_ORDER: AgentRole[] = PIPELINE_STAGES.flatMap(s => s.roles);

/** Get the pipeline stage that contains the given role. */
export function getStageForRole(role: AgentRole): PipelineStage {
  const stage = PIPELINE_STAGES.find(s => s.roles.includes(role));
  if (!stage) throw new Error(`No stage found for role: ${role}`);
  return stage;
}

export const AGENT_CONFIG: Record<
  AgentRole,
  { label: string; color: string; timeoutMs: number; tools: string[] }
> = {
  pm: {
    label: 'PM',
    color: '#A855F7',
    timeoutMs: 180_000,
    tools: ['Read'],
  },
  rd: {
    label: 'RD',
    color: '#3B82F6',
    timeoutMs: 600_000,
    tools: ['Read', 'Edit', 'Bash'],
  },
  ui: {
    label: 'UI',
    color: '#22C55E',
    timeoutMs: 600_000,
    tools: ['Read', 'Edit', 'Bash'],
  },
  test: {
    label: 'TEST',
    color: '#F97316',
    timeoutMs: 600_000,
    tools: ['Read', 'Edit', 'Bash'],
  },
  sec: {
    label: 'SEC',
    color: '#EF4444',
    timeoutMs: 300_000,
    tools: ['Read', 'Bash'],
  },
};

export type AgentActivity =
  | { kind: 'idle' }
  | { kind: 'thinking' }
  | { kind: 'tool_use'; toolName: string }
  | { kind: 'text' };
