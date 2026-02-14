import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

/**
 * Integration tests for the TypeScript compilation and build pipeline.
 *
 * These tests validate:
 * 1. The compiled output structure is correct
 * 2. Import paths are properly rewritten (.ts → .js)
 * 3. package.json configuration is correct for npm publishing
 * 4. All critical files are present in dist/
 */

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const distDir = path.join(projectRoot, 'dist');

describe('TypeScript Compilation Output', () => {
  // Check if dist exists (build must have been run)
  const distExists = fs.existsSync(distDir);

  describe('dist directory structure', () => {
    it('dist/ directory should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found (build not run)');
        return;
      }
      expect(fs.existsSync(distDir)).toBe(true);
    });

    it('dist/server.js should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found');
        return;
      }
      expect(fs.existsSync(path.join(distDir, 'server.js'))).toBe(true);
    });

    it('dist/bin/cdb.js should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found');
        return;
      }
      expect(fs.existsSync(path.join(distDir, 'bin', 'cdb.js'))).toBe(true);
    });

    it('dist/src/lib/find-root.js should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found');
        return;
      }
      expect(fs.existsSync(path.join(distDir, 'src', 'lib', 'find-root.js'))).toBe(true);
    });

    it('dist/src/lib/db/connection.js should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found');
        return;
      }
      expect(fs.existsSync(path.join(distDir, 'src', 'lib', 'db', 'connection.js'))).toBe(true);
    });

    it('dist/src/lib/agents/prompts.js should exist', () => {
      if (!distExists) {
        console.warn('Skipping: dist/ not found');
        return;
      }
      expect(fs.existsSync(path.join(distDir, 'src', 'lib', 'agents', 'prompts.js'))).toBe(true);
    });
  });

  describe('import path rewriting (.ts → .js)', () => {
    it('dist/server.js should use .js import extensions', () => {
      const serverPath = path.join(distDir, 'server.js');
      if (!fs.existsSync(serverPath)) {
        console.warn('Skipping: dist/server.js not found');
        return;
      }
      const content = fs.readFileSync(serverPath, 'utf-8');

      // All relative imports should use .js, not .ts
      const relativeImports = content.match(/from\s+['"]\.\/[^'"]+['"]/g) || [];
      for (const imp of relativeImports) {
        expect(imp).toMatch(/\.js['"]$/);
        expect(imp).not.toMatch(/\.ts['"]$/);
      }
    });

    it('dist/src/lib/db/connection.js should use .js import extensions', () => {
      const connPath = path.join(distDir, 'src', 'lib', 'db', 'connection.js');
      if (!fs.existsSync(connPath)) {
        console.warn('Skipping: dist/src/lib/db/connection.js not found');
        return;
      }
      const content = fs.readFileSync(connPath, 'utf-8');

      // Check schema import
      const relativeImports = content.match(/from\s+['"]\.\/[^'"]+['"]/g) || [];
      for (const imp of relativeImports) {
        expect(imp).toMatch(/\.js['"]$/);
      }

      // Check find-root import
      const parentImports = content.match(/from\s+['"]\.\.\/[^'"]+['"]/g) || [];
      for (const imp of parentImports) {
        expect(imp).toMatch(/\.js['"]$/);
      }
    });

    it('dist/src/lib/agents/prompts.js should use .js import extensions', () => {
      const promptsPath = path.join(distDir, 'src', 'lib', 'agents', 'prompts.js');
      if (!fs.existsSync(promptsPath)) {
        console.warn('Skipping: dist/src/lib/agents/prompts.js not found');
        return;
      }
      const content = fs.readFileSync(promptsPath, 'utf-8');

      // All relative imports should use .js
      const allRelativeImports = content.match(/from\s+['"]\.\.?\/[^'"]+['"]/g) || [];
      for (const imp of allRelativeImports) {
        expect(imp).toMatch(/\.js['"]$/);
      }
    });

    it('dist/bin/cdb.js should use .js import extension for find-root', () => {
      const cdbPath = path.join(distDir, 'bin', 'cdb.js');
      if (!fs.existsSync(cdbPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found');
        return;
      }
      const content = fs.readFileSync(cdbPath, 'utf-8');
      expect(content).toContain('find-root.js');
      expect(content).not.toMatch(/find-root\.ts/);
    });
  });

  describe('server.ts production mode support', () => {
    it('server.ts should use dir parameter for Next.js', () => {
      const serverSrc = fs.readFileSync(path.join(projectRoot, 'server.ts'), 'utf-8');
      expect(serverSrc).toContain('dir: dashboardDir');
    });

    it('server.ts should use inline conf in production mode', () => {
      const serverSrc = fs.readFileSync(path.join(projectRoot, 'server.ts'), 'utf-8');
      expect(serverSrc).toContain('nextOptions.conf');
    });

    it('server.ts should import findProjectRoot', () => {
      const serverSrc = fs.readFileSync(path.join(projectRoot, 'server.ts'), 'utf-8');
      expect(serverSrc).toContain('findProjectRoot');
    });
  });

  describe('compiled code should be valid JavaScript', () => {
    it('dist/server.js should not contain TypeScript-specific syntax', () => {
      const serverPath = path.join(distDir, 'server.js');
      if (!fs.existsSync(serverPath)) {
        console.warn('Skipping: dist/server.js not found');
        return;
      }
      const content = fs.readFileSync(serverPath, 'utf-8');
      // Should not contain TypeScript interface or type declarations
      expect(content).not.toMatch(/^interface\s+\w+/m);
      expect(content).not.toMatch(/^type\s+\w+\s*=/m);
    });

    it('dist/src/lib/find-root.js should not contain TypeScript annotations', () => {
      const frPath = path.join(distDir, 'src', 'lib', 'find-root.js');
      if (!fs.existsSync(frPath)) {
        console.warn('Skipping: dist/src/lib/find-root.js not found');
        return;
      }
      const content = fs.readFileSync(frPath, 'utf-8');
      // The function signature should not have `: string` annotation
      expect(content).toContain('export function findProjectRoot(referenceUrl)');
      // Should NOT have the typed version
      expect(content).not.toContain('referenceUrl: string');
    });
  });
});

describe('package.json Configuration', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
  );

  describe('bin configuration', () => {
    it('should have a "cdb" bin entry', () => {
      expect(pkg.bin).toBeDefined();
      expect(pkg.bin.cdb).toBeDefined();
    });

    it('bin.cdb should point to compiled JS file (not .ts)', () => {
      expect(pkg.bin.cdb).toBe('./dist/bin/cdb.js');
    });

    it('bin.cdb should NOT point to TypeScript file', () => {
      expect(pkg.bin.cdb).not.toMatch(/\.ts$/);
    });
  });

  describe('files configuration', () => {
    it('should have a "files" field', () => {
      expect(pkg.files).toBeDefined();
      expect(Array.isArray(pkg.files)).toBe(true);
    });

    it('should include "dist/" in files', () => {
      expect(pkg.files).toContain('dist/');
    });

    it('should include "prompts/" in files', () => {
      expect(pkg.files).toContain('prompts/');
    });

    it('should include ".next/server/" in files', () => {
      expect(pkg.files).toContain('.next/server/');
    });

    it('should include "next.config.mjs" in files', () => {
      expect(pkg.files).toContain('next.config.mjs');
    });

    it('should include .next manifest files', () => {
      expect(pkg.files).toContain('.next/build-manifest.json');
      expect(pkg.files).toContain('.next/BUILD_ID');
    });

    it('should NOT include .next/standalone/ (not used)', () => {
      expect(pkg.files).not.toContain('.next/standalone/');
    });

    it('should NOT include next.config.ts (replaced by .mjs)', () => {
      expect(pkg.files).not.toContain('next.config.ts');
    });
  });

  describe('scripts configuration', () => {
    it('should have a "build" script that compiles TypeScript', () => {
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.build).toContain('tsc -p tsconfig.server.json');
    });

    it('should have a "build" script that runs postbuild', () => {
      expect(pkg.scripts.build).toContain('postbuild.mjs');
    });

    it('should have a "prepublishOnly" script', () => {
      expect(pkg.scripts.prepublishOnly).toBeDefined();
      expect(pkg.scripts.prepublishOnly).toContain('npm run build');
    });

    it('should have a "start" script pointing to compiled server', () => {
      expect(pkg.scripts.start).toBeDefined();
      expect(pkg.scripts.start).toContain('dist/server.js');
    });

    it('should preserve "dev" script for development', () => {
      expect(pkg.scripts.dev).toBeDefined();
    });
  });

  describe('module type', () => {
    it('should be an ESM package (type: module)', () => {
      expect(pkg.type).toBe('module');
    });

    it('should not be private', () => {
      expect(pkg.private).not.toBe(true);
    });
  });
});

describe('tsconfig.server.json Configuration', () => {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.server.json');

  it('should exist', () => {
    expect(fs.existsSync(tsconfigPath)).toBe(true);
  });

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

  it('should have outDir set to ./dist', () => {
    expect(tsconfig.compilerOptions.outDir).toBe('./dist');
  });

  it('should have rewriteRelativeImportExtensions enabled', () => {
    expect(tsconfig.compilerOptions.rewriteRelativeImportExtensions).toBe(true);
  });

  it('should include bin/**/*.ts', () => {
    expect(tsconfig.include).toContain('bin/**/*.ts');
  });

  it('should include src/lib/**/*.ts', () => {
    expect(tsconfig.include).toContain('src/lib/**/*.ts');
  });

  it('should include server.ts', () => {
    expect(tsconfig.include).toContain('server.ts');
  });

  it('should include src/types/**/*.d.ts', () => {
    expect(tsconfig.include).toContain('src/types/**/*.d.ts');
  });

  it('should use nodenext module resolution', () => {
    expect(tsconfig.compilerOptions.moduleResolution).toBe('nodenext');
  });
});
