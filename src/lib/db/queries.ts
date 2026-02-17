import { v4 as uuidv4 } from 'uuid';
import { getDb } from './connection.ts';
import {
  AGENT_ORDER,
  type AgentRole,
  type AgentStep,
  type StepStatus,
  type Workflow,
  type WorkflowStatus,
} from '../workflow/types.ts';

// ---------------------------------------------------------------------------
// Internal helpers: snake_case <-> camelCase row mapping
// ---------------------------------------------------------------------------

interface WorkflowRow {
  id: string;
  title: string;
  user_prompt: string;
  status: string;
  current_step_index: number;
  project_path: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface AgentStepRow {
  id: string;
  workflow_id: string;
  role: string;
  status: string;
  prompt: string;
  output: string;
  error: string | null;
  retry_count: number;
  duration_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  started_at: string | null;
  completed_at: string | null;
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    title: row.title,
    userPrompt: row.user_prompt,
    status: row.status as WorkflowStatus,
    currentStepIndex: row.current_step_index,
    projectPath: row.project_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function rowToStep(row: AgentStepRow): AgentStep {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    role: row.role as AgentRole,
    status: row.status as StepStatus,
    prompt: row.prompt,
    output: row.output,
    error: row.error,
    retryCount: row.retry_count,
    durationMs: row.duration_ms,
    tokensIn: row.tokens_in,
    tokensOut: row.tokens_out,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Workflow CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new workflow together with its five agent-step rows (one per role
 * in `AGENT_ORDER`).  Everything runs inside a single transaction so that the
 * workflow and its steps are always created atomically.
 */
export function createWorkflow(
  id: string,
  title: string,
  userPrompt: string,
  projectPath: string,
): Workflow {
  const db = getDb();

  const insertWorkflow = db.prepare(`
    INSERT INTO workflows (id, title, user_prompt, status, current_step_index, project_path)
    VALUES (@id, @title, @userPrompt, 'pending', 0, @projectPath)
  `);

  const insertStep = db.prepare(`
    INSERT INTO agent_steps (id, workflow_id, role, status)
    VALUES (@id, @workflowId, @role, 'pending')
  `);

  const txn = db.transaction(() => {
    insertWorkflow.run({ id, title, userPrompt, projectPath });

    for (const role of AGENT_ORDER) {
      insertStep.run({
        id: uuidv4(),
        workflowId: id,
        role,
      });
    }
  });

  txn();

  return getWorkflow(id)!;
}

/**
 * Retrieve a single workflow by id, or `null` if not found.
 */
export function getWorkflow(id: string): Workflow | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM workflows WHERE id = ?');
  const row = stmt.get(id) as WorkflowRow | undefined;
  return row ? rowToWorkflow(row) : null;
}

/**
 * List workflows ordered by creation time (newest first).
 */
export interface WorkflowListFilters {
  status?: WorkflowStatus;
  q?: string;
}

export function listWorkflows(
  limit = 50,
  offset = 0,
  filters?: WorkflowListFilters,
): Workflow[] {
  const db = getDb();

  const where: string[] = [];
  const params: Record<string, unknown> = {
    limit,
    offset,
  };

  if (filters?.status) {
    where.push('status = @status');
    params.status = filters.status;
  }

  if (filters?.q && filters.q.trim()) {
    where.push('(title LIKE @q OR user_prompt LIKE @q)');
    params.q = `%${filters.q.trim()}%`;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const stmt = db.prepare(
    `SELECT * FROM workflows ${whereSql} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`,
  );
  const rows = stmt.all(params) as WorkflowRow[];
  return rows.map(rowToWorkflow);
}

export function countWorkflows(filters?: WorkflowListFilters): number {
  const db = getDb();

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.status) {
    where.push('status = @status');
    params.status = filters.status;
  }

  if (filters?.q && filters.q.trim()) {
    where.push('(title LIKE @q OR user_prompt LIKE @q)');
    params.q = `%${filters.q.trim()}%`;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM workflows ${whereSql}`);
  const row = stmt.get(params) as { count?: number } | undefined;
  return row?.count ?? 0;
}

/**
 * Update a workflow's status (and optionally the current step index).
 *
 * `updated_at` is always bumped.  When the status is a terminal state
 * (`completed`, `failed`, `cancelled`) `completed_at` is also set.
 */
export function updateWorkflowStatus(
  id: string,
  status: WorkflowStatus,
  currentStepIndex?: number,
): void {
  const db = getDb();

  const isTerminal =
    status === 'completed' || status === 'failed' || status === 'cancelled';

  if (currentStepIndex !== undefined) {
    const stmt = db.prepare(`
      UPDATE workflows
      SET status             = @status,
          current_step_index = @currentStepIndex,
          updated_at         = datetime('now'),
          completed_at       = CASE WHEN @isTerminal THEN datetime('now') ELSE completed_at END
      WHERE id = @id
    `);
    stmt.run({ id, status, currentStepIndex, isTerminal: isTerminal ? 1 : 0 });
  } else {
    const stmt = db.prepare(`
      UPDATE workflows
      SET status       = @status,
          updated_at   = datetime('now'),
          completed_at = CASE WHEN @isTerminal THEN datetime('now') ELSE completed_at END
      WHERE id = @id
    `);
    stmt.run({ id, status, isTerminal: isTerminal ? 1 : 0 });
  }
}

// ---------------------------------------------------------------------------
// AgentStep CRUD
// ---------------------------------------------------------------------------

/**
 * Return all steps for a given workflow, ordered by the canonical agent order.
 *
 * We use a CASE expression so the rows always come back in the same sequence
 * as `AGENT_ORDER` regardless of insertion order.
 */
export function getStepsForWorkflow(workflowId: string): AgentStep[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT *
    FROM agent_steps
    WHERE workflow_id = ?
    ORDER BY CASE role
      WHEN 'pm'   THEN 0
      WHEN 'rd'   THEN 1
      WHEN 'ui'   THEN 2
      WHEN 'test' THEN 3
      WHEN 'sec'  THEN 4
      ELSE 5
    END
  `);
  const rows = stmt.all(workflowId) as AgentStepRow[];
  return rows.map(rowToStep);
}

/**
 * Partial update for an agent step.  Only the fields present in `updates`
 * will be written; all others are left untouched.
 */
export interface StepUpdateFields {
  status?: StepStatus;
  prompt?: string;
  output?: string;
  error?: string | null;
  retryCount?: number;
  durationMs?: number | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export function updateStepStatus(id: string, updates: StepUpdateFields): void {
  const db = getDb();

  // Build SET clause dynamically based on provided keys.
  const columnMap: Record<keyof StepUpdateFields, string> = {
    status: 'status',
    prompt: 'prompt',
    output: 'output',
    error: 'error',
    retryCount: 'retry_count',
    durationMs: 'duration_ms',
    tokensIn: 'tokens_in',
    tokensOut: 'tokens_out',
    startedAt: 'started_at',
    completedAt: 'completed_at',
  };

  const setClauses: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const [key, column] of Object.entries(columnMap)) {
    if (key in updates) {
      setClauses.push(`${column} = @${key}`);
      params[key] = (updates as Record<string, unknown>)[key] ?? null;
    }
  }

  if (setClauses.length === 0) return;

  const sql = `UPDATE agent_steps SET ${setClauses.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(params);
}
