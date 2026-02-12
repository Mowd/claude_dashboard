import { AgentRole, AGENT_ORDER, AGENT_CONFIG } from './types';

export interface AgentContext {
  role: AgentRole;
  output: string;
}

/**
 * Build the prompt for an agent, including context from previous agents.
 */
export function buildAgentPrompt(
  role: AgentRole,
  userPrompt: string,
  previousOutputs: AgentContext[],
  projectPath: string
): string {
  const parts: string[] = [];

  parts.push(`# Project Path\n${projectPath}\n`);
  parts.push(`# User Request\n${userPrompt}\n`);

  if (previousOutputs.length > 0) {
    parts.push('# Previous Agent Outputs\n');
    for (const ctx of previousOutputs) {
      const config = AGENT_CONFIG[ctx.role];
      parts.push(`## ${config.label} Agent Output\n${ctx.output}\n`);
    }
  }

  const config = AGENT_CONFIG[role];
  const roleIndex = AGENT_ORDER.indexOf(role);
  const remainingAgents = AGENT_ORDER.slice(roleIndex + 1).map(
    (r) => AGENT_CONFIG[r].label
  );

  parts.push(`# Your Role: ${config.label} Agent`);
  if (remainingAgents.length > 0) {
    parts.push(
      `After you complete your work, the following agents will run: ${remainingAgents.join(' → ')}`
    );
  } else {
    parts.push('You are the final agent in the pipeline.');
  }

  return parts.join('\n\n');
}
