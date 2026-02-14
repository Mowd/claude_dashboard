import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

/**
 * Tests for the CLI entry point (bin/cdb.ts and its compiled output dist/bin/cdb.js).
 *
 * These tests validate the source code structure and compiled output
 * without actually spawning the server process.
 */

const projectRoot = path.resolve(__dirname, '..', '..', '..');

describe('bin/cdb.ts (CLI entry point source)', () => {
  const sourcePath = path.join(projectRoot, 'bin', 'cdb.ts');

  it('should exist', () => {
    expect(fs.existsSync(sourcePath)).toBe(true);
  });

  it('should have a shebang line', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('should import findProjectRoot', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('findProjectRoot');
    expect(content).toContain('../src/lib/find-root');
  });

  it('should use findProjectRoot to determine dashboard directory', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('findProjectRoot(import.meta.url)');
  });

  it('should check for compiled server (dist/server.js) first', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('dist/server.js') // Correct: uses dist/server.js in compiled mode
    // But also handles fallback to server.ts (for development mode)
    expect(content).toContain('server.ts');
  });

  it('should prefer compiled server over source server when dist exists', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    // The logic: compiledServer exists ? use compiled : use source
    expect(content).toContain('existsSync(compiledServer)');
    expect(content).toContain('? compiledServer : sourceServer');
  });

  it('should set correct environment variables for the spawned server', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('PROJECT_PATH');
    expect(content).toContain('PORT');
    expect(content).toContain('HOST');
  });

  it('should set NODE_ENV to production for npm-installed usage', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain("NODE_ENV: 'production'");
  });

  it('should handle graceful shutdown', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('SIGINT');
    expect(content).toContain('SIGTERM');
    expect(content).toContain('shutdown');
  });

  it('should handle errors in main()', () => {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    expect(content).toContain('.catch(');
    expect(content).toContain('process.exit(1)');
  });
});

describe('dist/bin/cdb.js (compiled CLI entry point)', () => {
  const compiledPath = path.join(projectRoot, 'dist', 'bin', 'cdb.js');

  it('should exist after build', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
      return;
    }
    expect(fs.existsSync(compiledPath)).toBe(true);
  });

  it('should have shebang as first line', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    const firstLine = content.split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env node');
  });

  it('should import find-root.js (not .ts)', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('find-root.js');
    expect(content).not.toContain("find-root.ts");
  });

  it('should be pure JavaScript (no TypeScript syntax)', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    // Should not contain TypeScript type annotations
    expect(content).not.toMatch(/:\s*(string|number|boolean|void)\b/);
    // Should not contain TypeScript import type syntax
    expect(content).not.toContain('import type');
  });

  it('should reference dist/server.js path', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('"dist"');
    expect(content).toContain('"server.js"');
  });
});
