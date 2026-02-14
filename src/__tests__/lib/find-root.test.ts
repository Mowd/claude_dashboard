import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';
import { findProjectRoot } from '../../lib/find-root';

// Use real temp directories instead of mocking fs — avoids mock leaking across test files in bun:test

describe('findProjectRoot', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-root-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should find the project root when package.json is in the current directory', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const testUrl = pathToFileURL(path.join(tmpDir, 'test.ts')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should walk up directories to find package.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const deepDir = path.join(tmpDir, 'src', 'lib', 'db');
    fs.mkdirSync(deepDir, { recursive: true });
    const testUrl = pathToFileURL(path.join(deepDir, 'connection.ts')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should find root from dist directory (compiled mode)', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const distDir = path.join(tmpDir, 'dist', 'src', 'lib', 'db');
    fs.mkdirSync(distDir, { recursive: true });
    const testUrl = pathToFileURL(path.join(distDir, 'connection.js')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should find root from dist/bin directory (CLI compiled mode)', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const binDir = path.join(tmpDir, 'dist', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.js')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should find root from source bin directory (dev mode)', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const binDir = path.join(tmpDir, 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.ts')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should stop searching after 10 levels and fallback to cwd()', () => {
    // Create a 12-level deep directory without any package.json
    let deep = tmpDir;
    for (let i = 0; i < 12; i++) {
      deep = path.join(deep, `level${i}`);
    }
    fs.mkdirSync(deep, { recursive: true });
    const testUrl = pathToFileURL(path.join(deep, 'file.ts')).href;

    const cwdSpy = spyOn(process, 'cwd').mockReturnValue('/fallback');
    const result = findProjectRoot(testUrl);
    expect(result).toBe('/fallback');
    cwdSpy.mockRestore();
  });

  it('should return the first directory containing package.json (not a parent)', () => {
    // Simulate a monorepo: both nested and parent have package.json
    const nestedRoot = path.join(tmpDir, 'packages', 'dashboard');
    const libDir = path.join(nestedRoot, 'src', 'lib');
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(nestedRoot, 'package.json'), '{}');
    const testUrl = pathToFileURL(path.join(libDir, 'file.ts')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(nestedRoot);
  });

  it('should handle file:// URLs correctly', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
    const libDir = path.join(tmpDir, 'src', 'lib');
    fs.mkdirSync(libDir, { recursive: true });
    const testUrl = `file://${path.join(libDir, 'test.ts')}`;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(tmpDir);
  });

  it('should work with deep npm-like path structure', () => {
    // Simulate: tmpDir/lib/node_modules/claude-dashboard/dist/bin/cdb.js
    const pkgRoot = path.join(tmpDir, 'lib', 'node_modules', 'claude-dashboard');
    const binDir = path.join(pkgRoot, 'dist', 'bin');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(path.join(pkgRoot, 'package.json'), '{}');
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.js')).href;

    const result = findProjectRoot(testUrl);
    expect(result).toBe(pkgRoot);
  });
});
