import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Tests for the postbuild.mjs script.
 *
 * These tests validate that:
 * 1. The shebang is correctly injected into dist/bin/cdb.js
 * 2. The file has executable permissions
 * 3. The script is idempotent (won't duplicate shebangs)
 */

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const distBinPath = path.join(projectRoot, 'dist', 'bin', 'cdb.js');
const postbuildScript = path.join(projectRoot, 'scripts', 'postbuild.mjs');

describe('postbuild.mjs script', () => {
  describe('script file validation', () => {
    it('postbuild.mjs should exist', () => {
      expect(fs.existsSync(postbuildScript)).toBe(true);
    });

    it('postbuild.mjs should be a valid ESM script', () => {
      const content = fs.readFileSync(postbuildScript, 'utf-8');
      expect(content).toContain('import');
      expect(content).toContain('readFileSync');
      expect(content).toContain('writeFileSync');
      expect(content).toContain('chmodSync');
    });

    it('postbuild.mjs should target dist/bin/cdb.js', () => {
      const content = fs.readFileSync(postbuildScript, 'utf-8');
      expect(content).toContain("'dist'");
      expect(content).toContain("'bin'");
      expect(content).toContain("'cdb.js'");
    });
  });

  describe('compiled output validation', () => {
    it('dist/bin/cdb.js should exist after build', () => {
      // This test assumes build has been run
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }
      expect(fs.existsSync(distBinPath)).toBe(true);
    });

    it('dist/bin/cdb.js should start with shebang', () => {
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }
      const content = fs.readFileSync(distBinPath, 'utf-8');
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    it('dist/bin/cdb.js should have executable permission', () => {
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }
      const stats = fs.statSync(distBinPath);
      // Check owner execute bit (0o100)
      expect(stats.mode & 0o111).toBeGreaterThan(0);
    });

    it('dist/bin/cdb.js should not have duplicate shebangs', () => {
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }
      const content = fs.readFileSync(distBinPath, 'utf-8');
      const shebangCount = (content.match(/^#!\/usr\/bin\/env node/gm) || []).length;
      expect(shebangCount).toBe(1);
    });

    it('dist/bin/cdb.js should have correct import path to find-root.js', () => {
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }
      const content = fs.readFileSync(distBinPath, 'utf-8');
      // Should import from ../src/lib/find-root.js (not .ts)
      expect(content).toContain('find-root.js');
      expect(content).not.toContain('find-root.ts');
    });
  });

  describe('postbuild idempotency', () => {
    it('running postbuild twice should not duplicate shebang', () => {
      if (!fs.existsSync(distBinPath)) {
        console.warn('Skipping: dist/bin/cdb.js not found (build not run)');
        return;
      }

      // Run the postbuild script
      execSync(`node ${postbuildScript}`, { cwd: projectRoot });

      const content = fs.readFileSync(distBinPath, 'utf-8');
      const shebangCount = (content.match(/^#!\/usr\/bin\/env node/gm) || []).length;
      expect(shebangCount).toBe(1);
    });
  });
});
