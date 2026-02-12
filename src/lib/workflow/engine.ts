import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { type AgentRole, type AgentActivity, AGENT_CONFIG, PIPELINE_STAGES, getStageForRole, type WorkflowStatus } from './types.ts';
import { type PipelineState, createPipelineState } from './pipeline.ts';
import { AgentRunner } from './agent-runner.ts';
import { buildAgentPrompt, type AgentContext } from './context-builder.ts';
import { getSystemPrompt } from '../agents/prompts.ts';

export interface WorkflowEngineEvents {
  'workflow:created': (workflowId: string, title: string) => void;
  'workflow:completed': (workflowId: string) => void;
  'workflow:failed': (workflowId: string, error: string) => void;
  'workflow:paused': (workflowId: string) => void;
  'workflow:cancelled': (workflowId: string) => void;
  'step:started': (workflowId: string, stepId: string, role: AgentRole) => void;
  'step:stream': (workflowId: string, stepId: string, role: AgentRole, chunk: string) => void;
  'step:completed': (workflowId: string, stepId: string, role: AgentRole, output: string, durationMs: number, tokensIn?: number, tokensOut?: number) => void;
  'step:failed': (workflowId: string, stepId: string, role: AgentRole, error: string) => void;
  'step:activity': (workflowId: string, stepId: string, role: AgentRole, activity: AgentActivity) => void;
  'step:retry': (workflowId: string, stepId: string, role: AgentRole, attempt: number, maxRetries: number, reason: string) => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000, 8000];

export class WorkflowEngine extends EventEmitter {
  private pipelines: Map<string, PipelineState> = new Map();
  private runners: Map<string, AgentRunner> = new Map();
  private stepIds: Map<string, Map<AgentRole, string>> = new Map();
  private stepOutputs: Map<string, Map<AgentRole, string>> = new Map();
  private paused: Set<string> = new Set();

  // Database operations injected from outside
  private dbOps: {
    createWorkflow: (id: string, title: string, userPrompt: string, projectPath: string) => void;
    updateWorkflowStatus: (id: string, status: WorkflowStatus, currentStepIndex?: number) => void;
    updateStepStatus: (id: string, updates: Record<string, unknown>) => void;
    getStepsForWorkflow: (workflowId: string) => Array<{ id: string; role: AgentRole; output: string; status: string }>;
  };

  constructor(dbOps: WorkflowEngine['dbOps']) {
    super();
    this.dbOps = dbOps;
  }

  async startWorkflow(userPrompt: string, projectPath: string): Promise<string> {
    const workflowId = uuidv4();
    const title = userPrompt.slice(0, 80) + (userPrompt.length > 80 ? '...' : '');

    this.dbOps.createWorkflow(workflowId, title, userPrompt, projectPath);

    const pipeline = createPipelineState(workflowId);
    pipeline.status = 'running';
    this.pipelines.set(workflowId, pipeline);
    this.stepOutputs.set(workflowId, new Map());

    // Get step IDs from DB
    const dbSteps = this.dbOps.getStepsForWorkflow(workflowId);
    const stepIdMap = new Map<AgentRole, string>();
    for (const step of dbSteps) {
      stepIdMap.set(step.role, step.id);
    }
    this.stepIds.set(workflowId, stepIdMap);

    this.dbOps.updateWorkflowStatus(workflowId, 'running');
    this.emit('workflow:created', workflowId, title);

    // Defer to macrotask so callers can subscribe (microtask) before first step:started fires
    setTimeout(() => {
      this.executePipeline(workflowId, userPrompt, projectPath).catch((err) => {
        console.error(`Workflow ${workflowId} failed:`, err);
      });
    }, 0);

    return workflowId;
  }

  private async executePipeline(workflowId: string, userPrompt: string, projectPath: string) {
    const pipeline = this.pipelines.get(workflowId);
    if (!pipeline) return;

    for (const stage of PIPELINE_STAGES) {
      // Check if cancelled
      if ((pipeline.status as string) === 'cancelled') {
        this.cleanupWorkflow(workflowId);
        return;
      }
      // Wait while paused
      while (this.paused.has(workflowId)) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if ((pipeline.status as string) === 'cancelled') {
          this.cleanupWorkflow(workflowId);
          return;
        }
      }

      pipeline.currentStageIndex = stage.index;
      this.dbOps.updateWorkflowStatus(workflowId, 'running', stage.index);

      // Execute all roles in this stage in parallel
      const results = await Promise.allSettled(
        stage.roles.map(role => this.executeStep(workflowId, role, userPrompt, projectPath))
      );

      // Check for failures after all peers finish
      const failedRoles: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const role = stage.roles[i];
        const stepState = pipeline.steps.find(s => s.role === role);

        if (result.status === 'fulfilled' && result.value) {
          if (stepState) stepState.status = 'completed';
        } else {
          failedRoles.push(AGENT_CONFIG[role].label);
        }
      }

      if (failedRoles.length > 0) {
        if ((pipeline.status as string) === 'cancelled') {
          this.cleanupWorkflow(workflowId);
          return;
        }
        pipeline.status = 'failed';
        this.dbOps.updateWorkflowStatus(workflowId, 'failed');
        this.emit('workflow:failed', workflowId, `Agent(s) ${failedRoles.join(', ')} failed`);
        this.cleanupWorkflow(workflowId);
        return;
      }
    }

    pipeline.status = 'completed';
    this.dbOps.updateWorkflowStatus(workflowId, 'completed');
    this.emit('workflow:completed', workflowId);
    this.cleanupWorkflow(workflowId);
  }

  private async executeStep(
    workflowId: string,
    role: AgentRole,
    userPrompt: string,
    projectPath: string
  ): Promise<boolean> {
    const stepIdMap = this.stepIds.get(workflowId)!;
    const stepId = stepIdMap.get(role)!;
    const outputsMap = this.stepOutputs.get(workflowId)!;

    // Collect outputs from all prior stages (not peers in the same stage)
    const currentStage = getStageForRole(role);
    const previousOutputs: AgentContext[] = [];
    for (const priorStage of PIPELINE_STAGES) {
      if (priorStage.index >= currentStage.index) break;
      for (const priorRole of priorStage.roles) {
        const output = outputsMap.get(priorRole);
        if (output) {
          previousOutputs.push({ role: priorRole, output });
        }
      }
    }

    const prompt = buildAgentPrompt(role, userPrompt, previousOutputs, projectPath);
    const systemPrompt = getSystemPrompt(role, projectPath);

    let retries = 0;
    while (retries <= MAX_RETRIES) {
      // Bail out if workflow was cancelled during a retry
      const pipeline = this.pipelines.get(workflowId);
      if (pipeline && (pipeline.status as string) === 'cancelled') {
        this.runners.delete(`${workflowId}:${role}`);
        return false;
      }

      try {
        this.dbOps.updateStepStatus(stepId, {
          status: 'running',
          prompt,
          retryCount: retries,
          startedAt: new Date().toISOString(),
        });

        this.emit('step:started', workflowId, stepId, role);
        const startTime = Date.now();

        const runner = new AgentRunner(role);
        this.runners.set(`${workflowId}:${role}`, runner);

        // Capture token usage from the runner's result event
        let runnerTokensIn: number | undefined;
        let runnerTokensOut: number | undefined;

        runner.on('stream', (chunk: string) => {
          this.emit('step:stream', workflowId, stepId, role, chunk);
        });

        runner.on('activity', (activity: AgentActivity) => {
          this.emit('step:activity', workflowId, stepId, role, activity);
        });

        runner.on('result', (_output: string, tokensIn?: number, tokensOut?: number) => {
          if (tokensIn !== undefined) runnerTokensIn = tokensIn;
          if (tokensOut !== undefined) runnerTokensOut = tokensOut;
        });

        await runner.run(prompt, systemPrompt, projectPath);

        const durationMs = Date.now() - startTime;
        const output = runner.getOutput();
        outputsMap.set(role, output);

        this.dbOps.updateStepStatus(stepId, {
          status: 'completed',
          output,
          durationMs,
          tokensIn: runnerTokensIn ?? null,
          tokensOut: runnerTokensOut ?? null,
          completedAt: new Date().toISOString(),
        });

        this.emit('step:completed', workflowId, stepId, role, output, durationMs, runnerTokensIn, runnerTokensOut);
        this.runners.delete(`${workflowId}:${role}`);
        return true;
      } catch (err: any) {
        retries++;
        const errMsg = err.message || String(err);
        console.error(`[${AGENT_CONFIG[role].label}] Attempt ${retries} failed:`, errMsg);

        if (retries > MAX_RETRIES) {
          this.dbOps.updateStepStatus(stepId, {
            status: 'failed',
            error: errMsg,
            completedAt: new Date().toISOString(),
          });
          this.emit('step:failed', workflowId, stepId, role, errMsg);
          this.runners.delete(`${workflowId}:${role}`);
          return false;
        }

        // Check cancellation before retrying
        const pipelineState = this.pipelines.get(workflowId);
        if (pipelineState && (pipelineState.status as string) === 'cancelled') {
          this.runners.delete(`${workflowId}:${role}`);
          return false;
        }

        // Notify about retry
        this.emit('step:retry', workflowId, stepId, role, retries, MAX_RETRIES, errMsg);

        // Exponential backoff
        const delay = RETRY_DELAYS[retries - 1] || 8000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  pauseWorkflow(workflowId: string) {
    const pipeline = this.pipelines.get(workflowId);
    if (pipeline && pipeline.status === 'running') {
      this.paused.add(workflowId);
      pipeline.status = 'paused';
      this.dbOps.updateWorkflowStatus(workflowId, 'paused');
      this.emit('workflow:paused', workflowId);
    }
  }

  resumeWorkflow(workflowId: string) {
    const pipeline = this.pipelines.get(workflowId);
    if (pipeline && pipeline.status === 'paused') {
      this.paused.delete(workflowId);
      pipeline.status = 'running';
      this.dbOps.updateWorkflowStatus(workflowId, 'running');
    }
  }

  cancelWorkflow(workflowId: string) {
    const pipeline = this.pipelines.get(workflowId);
    if (!pipeline) return;

    pipeline.status = 'cancelled';
    this.paused.delete(workflowId);

    // Kill running agents
    for (const [key, runner] of this.runners.entries()) {
      if (key.startsWith(workflowId)) {
        runner.kill();
        this.runners.delete(key);
      }
    }

    this.dbOps.updateWorkflowStatus(workflowId, 'cancelled');
    this.emit('workflow:cancelled', workflowId);
    // Note: executePipeline loop will also call cleanupWorkflow when it detects cancelled.
    // But if executePipeline already exited (e.g. stuck in pause polling), clean up here too.
    // delete is idempotent so double-cleanup is safe.
    this.stepIds.delete(workflowId);
    this.stepOutputs.delete(workflowId);
  }

  private cleanupWorkflow(workflowId: string) {
    this.pipelines.delete(workflowId);
    this.stepIds.delete(workflowId);
    this.stepOutputs.delete(workflowId);
    this.paused.delete(workflowId);
  }

  getPipelineState(workflowId: string): PipelineState | undefined {
    return this.pipelines.get(workflowId);
  }
}
