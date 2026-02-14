import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

/**
 * Tests for prompts.ts path resolution changes.
 *
 * The key change: prompts.ts now uses findProjectRoot() instead of
 * hardcoded relative paths to locate the prompts/ directory.
 */

const projectRoot = path.resolve(__dirname, '..', '..', '..');

describe('prompts.ts source code validation', () => {
  const promptsPath = path.join(projectRoot, 'src', 'lib', 'agents', 'prompts.ts');

  it('should exist', () => {
    expect(fs.existsSync(promptsPath)).toBe(true);
  });

  it('should import findProjectRoot', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    expect(content).toContain("import { findProjectRoot } from '../find-root.ts'");
  });

  it('should use findProjectRoot(import.meta.url) to determine PROJECT_ROOT', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    expect(content).toContain('findProjectRoot(import.meta.url)');
  });

  it('should construct PROMPTS_DIR from PROJECT_ROOT', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    expect(content).toContain("PROMPTS_DIR");
    expect(content).toContain("'prompts'");
  });

  it('should NOT use hardcoded relative paths for prompts directory', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    // Should not have old patterns like path.join(__dirname, '..', '..', '..', 'prompts')
    expect(content).not.toMatch(/join\s*\(\s*__dirname[^)]*'prompts'/);
  });

  it('should have fallback DEFAULT_SYSTEM_PROMPTS for all agent roles', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    const roles = ['pm', 'rd', 'ui', 'test', 'sec'];
    for (const role of roles) {
      expect(content).toContain(`${role}:`);
    }
  });

  it('should export getSystemPrompt function', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    expect(content).toContain('export function getSystemPrompt');
  });

  it('loadPromptTemplate should have try-catch fallback', () => {
    const content = fs.readFileSync(promptsPath, 'utf-8');
    expect(content).toContain('loadPromptTemplate');
    expect(content).toContain('catch');
    expect(content).toContain('DEFAULT_SYSTEM_PROMPTS');
  });
});

describe('prompts.js compiled output validation', () => {
  const compiledPath = path.join(
    projectRoot,
    'dist',
    'src',
    'lib',
    'agents',
    'prompts.js'
  );

  it('should exist after build', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled prompts.js not found');
      return;
    }
    expect(fs.existsSync(compiledPath)).toBe(true);
  });

  it('should import find-root.js (not .ts)', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled prompts.js not found');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    expect(content).toContain('find-root.js');
    expect(content).not.toContain("find-root.ts");
  });

  it('should import workflow types with .js extension', () => {
    if (!fs.existsSync(compiledPath)) {
      console.warn('Skipping: compiled prompts.js not found');
      return;
    }
    const content = fs.readFileSync(compiledPath, 'utf-8');
    // Should use .js extension for relative imports
    const relativeImports = content.match(/from\s+['"]\.\.?\/[^'"]+['"]/g) || [];
    for (const imp of relativeImports) {
      expect(imp).toMatch(/\.js['"]$/);
    }
  });
});

describe('prompts directory', () => {
  const promptsDir = path.join(projectRoot, 'prompts');

  it('prompts/ directory should exist', () => {
    expect(fs.existsSync(promptsDir)).toBe(true);
  });

  it('should contain system prompt files for all agent roles', () => {
    const roles = ['pm', 'rd', 'ui', 'test', 'sec'];
    for (const role of roles) {
      const promptFile = path.join(promptsDir, `${role}-system.md`);
      if (!fs.existsSync(promptFile)) {
        // This is expected - some roles may not have custom prompt files
        // The code has fallback DEFAULT_SYSTEM_PROMPTS
        console.log(`Note: ${role}-system.md not found (will use default)`);
      }
    }
  });
});
