import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { type AgentRole, type AgentActivity, AGENT_CONFIG } from './types.ts';

export interface AgentRunnerEvents {
  stream: (chunk: string) => void;
  activity: (activity: AgentActivity) => void;
  result: (output: string, tokensIn?: number, tokensOut?: number) => void;
  error: (error: string) => void;
}

export class AgentRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private killed = false;
  private output = '';
  private resultEmitted = false;
  private role: AgentRole;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private hardTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(role: AgentRole) {
    super();
    this.role = role;
    // Prevent Node from throwing on unhandled 'error' events
    this.on('error', () => {});
  }

  async run(prompt: string, systemPrompt: string, projectPath: string): Promise<void> {
    const config = AGENT_CONFIG[this.role];

    return new Promise<void>((resolve, reject) => {
      // Guard against double resolve/reject
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        this.clearAllTimers();
        fn();
      };

      const args = [
        '-p', prompt,
        '--verbose',
        '--output-format', 'stream-json',
        '--max-turns', '50',
        '--dangerously-skip-permissions',
        '--include-partial-messages',
      ];

      if (systemPrompt) {
        args.push('--system-prompt', systemPrompt);
      }

      // Restrict tools based on role
      const allowedTools = config.tools;
      if (allowedTools.length > 0) {
        args.push('--allowedTools', allowedTools.join(','));
      }

      this.process = spawn('claude', args, {
        cwd: projectPath,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Close stdin so `claude -p` receives EOF and starts processing
      this.process.stdin?.end();

      // Hard timeout: 2x configured timeout, absolute upper bound
      this.hardTimeoutTimer = setTimeout(() => {
        this.kill();
        const err = `Agent ${config.label} hard timeout after ${(config.timeoutMs * 2) / 1000}s`;
        this.emit('error', err);
        settle(() => reject(new Error(err)));
      }, config.timeoutMs * 2);

      // Activity-based timeout: resets on every stream event
      this.resetActivityTimeout(settle, reject);

      let buffer = '';

      this.process.stdout?.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            this.handleStreamEvent(event);
          } catch {
            // Non-JSON output, treat as raw text — still counts as activity
            this.resetActivityTimeout();
            this.output += line + '\n';
            this.emit('stream', line + '\n');
          }
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        console.error(`[${config.label}] stderr:`, text.trim());
      });

      this.process.on('close', (code) => {
        if (this.killed) {
          settle(() => reject(new Error('Agent was killed')));
          return;
        }
        if (code === 0) {
          if (!this.resultEmitted) {
            this.emit('result', this.output);
          }
          settle(() => resolve());
        } else {
          const err = `Agent ${config.label} exited with code ${code}`;
          this.emit('error', err);
          settle(() => reject(new Error(err)));
        }
      });

      this.process.on('error', (err) => {
        this.emit('error', err.message);
        settle(() => reject(err));
      });
    });
  }

  private handleStreamEvent(event: any) {
    // Any JSON event from CLI means the agent is alive — reset inactivity timer
    this.resetActivityTimeout();

    switch (event.type) {
      case 'stream_event': {
        // Unwrap the inner event from stream_event wrapper
        const inner = event.event;
        if (!inner) break;

        switch (inner.type) {
          case 'content_block_start': {
            const block = inner.content_block;
            if (block?.type === 'thinking') {
              this.emit('activity', { kind: 'thinking' });
            } else if (block?.type === 'tool_use') {
              this.emit('activity', { kind: 'tool_use', toolName: block.name || 'unknown' });
            } else if (block?.type === 'text') {
              this.emit('activity', { kind: 'text' });
            }
            break;
          }
          case 'content_block_delta': {
            if (inner.delta?.type === 'text_delta' && inner.delta.text) {
              this.output += inner.delta.text;
              this.emit('stream', inner.delta.text);
            }
            break;
          }
          case 'content_block_stop':
            this.emit('activity', { kind: 'idle' });
            break;
        }
        break;
      }

      case 'assistant':
        // With --include-partial-messages, text is already captured via stream_event.
        // This handler serves as fallback for edge cases where streaming missed content.
        if (event.message?.content) {
          const fullText = event.message.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => b.text)
            .join('');

          if (fullText && !this.output.includes(fullText.slice(0, 100))) {
            // Streaming missed this content — add separator and append
            if (this.output.length > 0) {
              this.output += '\n\n';
              this.emit('stream', '\n\n');
            }
            this.output += fullText;
            this.emit('stream', fullText);
          } else if (this.output.length > 0) {
            // Content already captured via streaming — just add turn separator
            this.output += '\n\n';
            this.emit('stream', '\n\n');
          }
        }
        break;

      case 'result':
        if (event.result && !this.resultEmitted) {
          this.resultEmitted = true;
          const tokensIn = event.usage?.input_tokens;
          const tokensOut = event.usage?.output_tokens;
          if (!this.output) {
            this.output = typeof event.result === 'string'
              ? event.result
              : JSON.stringify(event.result);
          }
          this.emit('result', this.output, tokensIn, tokensOut);
        }
        break;
    }
  }

  kill() {
    this.killed = true;
    this.clearAllTimers();
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      // Force kill after 5s if process hasn't exited
      setTimeout(() => {
        if (this.process && this.process.exitCode === null) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  private settleRef: { settle: (fn: () => void) => void; reject: (err: Error) => void } | null = null;

  private resetActivityTimeout(settle?: (fn: () => void) => void, reject?: (err: Error) => void) {
    // Store settle/reject on first call (from run()), reuse on subsequent calls (from handleStreamEvent)
    if (settle && reject) {
      this.settleRef = { settle, reject };
    }
    if (this.activityTimer) clearTimeout(this.activityTimer);
    const config = AGENT_CONFIG[this.role];
    this.activityTimer = setTimeout(() => {
      this.kill();
      const err = `Agent ${config.label} timed out after ${config.timeoutMs / 1000}s of inactivity`;
      this.emit('error', err);
      if (this.settleRef) {
        this.settleRef.settle(() => this.settleRef!.reject(new Error(err)));
      }
    }, config.timeoutMs);
  }

  private clearAllTimers() {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    if (this.hardTimeoutTimer) {
      clearTimeout(this.hardTimeoutTimer);
      this.hardTimeoutTimer = null;
    }
  }

  getOutput(): string {
    return this.output;
  }
}
