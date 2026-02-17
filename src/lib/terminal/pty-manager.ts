import { v4 as uuidv4 } from 'uuid';
import { existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// node-pty is optional - gracefully handle if not available
let pty: any;
try {
  pty = require('node-pty');
  fixSpawnHelperPermissions();
} catch {
  console.warn('[PTY] node-pty not available, terminal features disabled');
}

function fixSpawnHelperPermissions() {
  if (process.platform === 'win32') return;
  try {
    const ptyPath = require.resolve('node-pty');
    const baseDir = join(dirname(ptyPath), '..');
    const arch = process.arch;
    const helperPath = join(baseDir, 'prebuilds', `${process.platform}-${arch}`, 'spawn-helper');
    if (existsSync(helperPath)) {
      chmodSync(helperPath, 0o755);
    }
  } catch {}
}

function getShellPath(): string {
  if (process.platform === 'win32') return 'powershell.exe';

  const preferred = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash';
  if (existsSync(preferred)) return preferred;
  return '/bin/sh';
}

interface PtySession {
  id: string;
  process: any; // IPty
  onData: (data: string) => void;
}

export class PtyManager {
  private sessions: Map<string, PtySession> = new Map();

  create(cwd: string, onData: (data: string) => void): string {
    if (!pty) {
      throw new Error('node-pty is not available');
    }

    const id = uuidv4();
    const shell = getShellPath();

    const proc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: { ...process.env },
    });

    const session: PtySession = { id, process: proc, onData };

    proc.onData((data: string) => {
      session.onData(data);
    });

    proc.onExit(() => {
      this.sessions.delete(id);
    });

    this.sessions.set(id, session);
    return id;
  }

  attach(id: string, onData: (data: string) => void): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.onData = onData;
    return true;
  }

  write(id: string, data: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.write(data);
    }
  }

  resize(id: string, cols: number, rows: number) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.resize(cols, rows);
    }
  }

  kill(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.process.kill();
      this.sessions.delete(id);
    }
  }

  killAll() {
    for (const session of this.sessions.values()) {
      session.process.kill();
    }
    this.sessions.clear();
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}
