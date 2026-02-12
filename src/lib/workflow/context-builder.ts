import { type AgentRole, AGENT_CONFIG, PIPELINE_STAGES, getStageForRole } from './types.ts';

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
  const currentStage = getStageForRole(role);

  // Peers running in parallel within the same stage
  const peers = currentStage.roles
    .filter((r) => r !== role)
    .map((r) => AGENT_CONFIG[r].label);

  // Agents in later stages
  const downstreamStages = PIPELINE_STAGES.filter(
    (s) => s.index > currentStage.index
  );
  const downstreamLabels = downstreamStages.flatMap((s) =>
    s.roles.map((r) => AGENT_CONFIG[r].label)
  );

  parts.push(`# Your Role: ${config.label} Agent`);
  if (peers.length > 0) {
    parts.push(`You are running IN PARALLEL with: ${peers.join(', ')}`);
  }
  if (downstreamLabels.length > 0) {
    parts.push(
      `After this stage completes, the following agents will run: ${downstreamLabels.join(' → ')}`
    );
  } else {
    parts.push('You are in the final stage of the pipeline.');
  }

  parts.push('# Important: Output Language');
  parts.push('Respond in the SAME language as the "# User Request" section above. Do NOT switch to English just because the template is in English.');

  return parts.join('\n\n');
}
