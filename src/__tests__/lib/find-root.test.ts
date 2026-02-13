import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findProjectRoot } from '../../lib/find-root';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

// We need to test findProjectRoot with real filesystem paths
// since it uses existsSync which we'll mock for controlled testing

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

const mockedExistsSync = vi.mocked(fs.existsSync);

describe('findProjectRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should find the project root when package.json is in the current directory', () => {
    const testDir = '/Users/test/project/src/lib';
    const testUrl = pathToFileURL(path.join(testDir, 'test.ts')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(testDir, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(testDir);
  });

  it('should walk up directories to find package.json', () => {
    const projectRoot = '/Users/test/project';
    const deepDir = path.join(projectRoot, 'src', 'lib', 'db');
    const testUrl = pathToFileURL(path.join(deepDir, 'connection.ts')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });

  it('should find root from dist directory (compiled mode)', () => {
    const projectRoot = '/Users/test/project';
    const distDir = path.join(projectRoot, 'dist', 'src', 'lib', 'db');
    const testUrl = pathToFileURL(path.join(distDir, 'connection.js')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });

  it('should find root from dist/bin directory (CLI compiled mode)', () => {
    const projectRoot = '/Users/test/project';
    const binDir = path.join(projectRoot, 'dist', 'bin');
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.js')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });

  it('should find root from source bin directory (dev mode)', () => {
    const projectRoot = '/Users/test/project';
    const binDir = path.join(projectRoot, 'bin');
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.ts')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });

  it('should stop searching after 10 levels', () => {
    const deepPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n';
    const testUrl = pathToFileURL(path.join(deepPath, 'file.ts')).href;

    // Never return true for package.json
    mockedExistsSync.mockReturnValue(false);

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fallback');
    const result = findProjectRoot(testUrl);
    // Should fallback to process.cwd()
    expect(result).toBe('/fallback');
    cwdSpy.mockRestore();
  });

  it('should stop at filesystem root', () => {
    const testUrl = pathToFileURL('/file.ts').href;

    mockedExistsSync.mockReturnValue(false);

    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fallback');
    const result = findProjectRoot(testUrl);
    expect(result).toBe('/fallback');
    cwdSpy.mockRestore();
  });

  it('should return the first directory containing package.json (not a parent)', () => {
    // Simulating a monorepo where a nested package also has package.json
    const nestedRoot = '/Users/test/project/packages/dashboard';
    const libDir = path.join(nestedRoot, 'src', 'lib');
    const testUrl = pathToFileURL(path.join(libDir, 'file.ts')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      // Both nested and parent have package.json, but nested is found first
      return (
        p === path.join(nestedRoot, 'package.json') ||
        p === path.join('/Users/test/project', 'package.json')
      );
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(nestedRoot);
  });

  it('should handle file:// URLs correctly', () => {
    const projectRoot = '/Users/test/project';
    const testUrl = `file://${path.join(projectRoot, 'src', 'lib', 'test.ts')}`;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });

  it('should work with npm global install path structure', () => {
    // Simulate: /opt/homebrew/lib/node_modules/claude-dashboard/dist/bin/cdb.js
    const projectRoot = '/opt/homebrew/lib/node_modules/claude-dashboard';
    const binDir = path.join(projectRoot, 'dist', 'bin');
    const testUrl = pathToFileURL(path.join(binDir, 'cdb.js')).href;

    mockedExistsSync.mockImplementation((p: fs.PathLike) => {
      return p === path.join(projectRoot, 'package.json');
    });

    const result = findProjectRoot(testUrl);
    expect(result).toBe(projectRoot);
  });
});
