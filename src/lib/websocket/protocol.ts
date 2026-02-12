import type { AgentRole, AgentActivity } from '@/lib/workflow/types';

// ---------------------------------------------------------------------------
// Client -> Server messages
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: 'workflow:start'; payload: { prompt: string; projectPath: string } }
  | { type: 'workflow:pause'; payload: { workflowId: string } }
  | { type: 'workflow:resume'; payload: { workflowId: string } }
  | { type: 'workflow:cancel'; payload: { workflowId: string } }
  | { type: 'workflow:subscribe'; payload: { workflowId: string } }
  | { type: 'terminal:create'; payload: { projectPath: string } }
  | { type: 'terminal:input'; payload: { terminalId: string; data: string } }
  | {
      type: 'terminal:resize';
      payload: { terminalId: string; cols: number; rows: number };
    }
  | { type: 'terminal:close'; payload: { terminalId: string } }
  | { type: 'ping' };

// ---------------------------------------------------------------------------
// Server -> Client messages
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: 'workflow:created'; payload: { workflowId: string; title: string } }
  | { type: 'workflow:completed'; payload: { workflowId: string } }
  | { type: 'workflow:failed'; payload: { workflowId: string; error: string } }
  | { type: 'workflow:paused'; payload: { workflowId: string } }
  | { type: 'workflow:cancelled'; payload: { workflowId: string } }
  | {
      type: 'step:started';
      payload: { workflowId: string; stepId: string; role: AgentRole };
    }
  | {
      type: 'step:stream';
      payload: {
        workflowId: string;
        stepId: string;
        role: AgentRole;
        chunk: string;
      };
    }
  | {
      type: 'step:completed';
      payload: {
        workflowId: string;
        stepId: string;
        role: AgentRole;
        output: string;
        durationMs: number;
        tokensIn?: number;
        tokensOut?: number;
      };
    }
  | {
      type: 'step:failed';
      payload: {
        workflowId: string;
        stepId: string;
        role: AgentRole;
        error: string;
      };
    }
  | {
      type: 'step:activity';
      payload: {
        workflowId: string;
        stepId: string;
        role: AgentRole;
        activity: AgentActivity;
      };
    }
  | {
      type: 'step:retry';
      payload: {
        workflowId: string;
        stepId: string;
        role: AgentRole;
        attempt: number;
        maxRetries: number;
        reason: string;
      };
    }
  | { type: 'terminal:created'; payload: { terminalId: string } }
  | { type: 'terminal:output'; payload: { terminalId: string; data: string } }
  | { type: 'terminal:error'; payload: { error: string } }
  | { type: 'terminal:closed'; payload: { terminalId: string } }
  | { type: 'pong' };
