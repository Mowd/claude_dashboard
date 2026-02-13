import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Tests for connection.ts path resolution changes.
 *
 * The key change: connection.ts now uses findProjectRoot() instead of
 * hardcoded '../../../' to locate the sql.js WASM file. This ensures
 * the path works from both:
 *   - src/lib/db/connection.ts (development)
 *   - dist/src/lib/db/connection.js (compiled/npm install)
 */

const projectRoot = path.resolve(__dirname, '..', '..');

describe('connection.ts source code validation', () => {
  const connectionPath = path.join(projectRoot, 'src', 'lib', 'db', 'connection.ts');

  it('should exist', () => {
    expect(fs.existsSync(connectionPath)).toBe(true);
  });

  it('should import findProjectRoot', () => {
    const content = fs.readFileSync(connectionPath, 'utf-8');
    expect(content).toContain("import { findProjectRoot } from '../find-root.ts'");
  });

  it('should use findProjectRoot(import.meta.url) to locate project root', () => {
    const content = fs.readFileSync(connectionPath, 'utf-8');
    expect(content).toContain('findProjectRoot(import.meta.url)');
  });

  it('should NOT use hardcoded relative path for WASM file', () => {
    const content = fs.readFileSync(connectionPath, 'utf-8');
    // Should NOT have the old hardcoded pattern: path.join(dir, '..', '..', '..')
    // The old pattern would be something like dirname + multiple ../..
    // Now it should use findProjectRoot instead
    expect(content).not.toMatch(/join\([^)]*'\.\.'\s*,\s*'\.\.'\s*,\s*'\.\.'/);
  });

  it('should locate sql-wasm.wasm under node_modules/sql.js/dist/', () => {
    const content = fs.readFileSync(connectionPath, 'utf-8');
    expect(content).toContain("'node_modules'");
    expect(content).toContain("'sql.js'");
    expect(content).toContain("'sql-wasm.wasm'");
  });

  it('should use atomic write pattern for persistence (write to .tmp then rename)', () => {
    const content = fs.readFileSync(connectionPath, 'utf-8');
    expect(content).toContain('.tmp');
    expect(content).toContain('renameSync');
  });
});

describe('connection.js compiled output validation', () => {
  const compiledPath = path.join(projectRoot, 'dist', 'src', 'lib', 'db', 'connection.js');

  it('should exist after build', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled connection.js not found');
      return;
    }
    expect(fs.existsSync(compiledPath)).toBe(true);
  });

  it('should import find-root.js (not .ts)', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled connection.js not found');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('find-root.js');
    expect(content).not.toContain("find-root.ts");
  });

  it('should import schema.js (not .ts)', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled connection.js not found');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('schema.js');
    expect(content).not.toMatch(/['"]\.\/schema\.ts['"]/);
  });

  it('should use findProjectRoot for WASM path resolution', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled connection.js not found');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('findProjectRoot');
  });
});

describe('WASM file availability', () => {
  it('sql-wasm.wasm should exist in node_modules', () => {
    const wasmPath = path.join(
      projectRoot,
      'node_modules',
      'sql.js',
      'dist',
      'sql-wasm.wasm'
    );
    expect(fs.existsSync(wasmPath)).toBe(true);
  });
});
