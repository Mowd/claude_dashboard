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

/** The fixed execution order for agents within a workflow. */
export const AGENT_ORDER: AgentRole[] = ['pm', 'rd', 'ui', 'test', 'sec'];

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
