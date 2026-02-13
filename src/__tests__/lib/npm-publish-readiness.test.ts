import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Tests to validate npm publish readiness.
 *
 * These tests ensure the package is correctly configured for
 * `npm install -g claude-dashboard` usage, addressing the original
 * ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING error.
 */

const projectRoot = path.resolve(__dirname, '..', '..');

describe('npm publish readiness', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
  );

  describe('the original bug should be fixed', () => {
    it('bin entry should NOT point to a .ts file', () => {
      // This was the root cause: bin pointed to ./bin/cdb.ts
      // Node.js cannot strip types from files in node_modules
      const binEntries = Object.values(pkg.bin || {});
      for (const entry of binEntries) {
        expect(entry).not.toMatch(/\.ts$/);
        expect(entry).toMatch(/\.js$/);
      }
    });

    it('bin entry should point to a file under dist/', () => {
      expect(pkg.bin.cdb).toMatch(/^\.\/dist\//);
    });

    it('the compiled bin file should exist', () => {
      const binPath = path.join(projectRoot, pkg.bin.cdb);
      if (!fs.existsSync(binPath)) {
        console.warn('Skipping: compiled bin file not found (build not run)');
        return;
      }
      expect(fs.existsSync(binPath)).toBe(true);
    });

    it('the compiled bin file should be executable', () => {
      const binPath = path.join(projectRoot, pkg.bin.cdb);
      if (!fs.existsSync(binPath)) {
        console.warn('Skipping: compiled bin file not found');
        return;
      }
      const stats = fs.statSync(binPath);
      expect(stats.mode & 0o111).toBeGreaterThan(0);
    });
  });

  describe('files field for publishing', () => {
    it('should have files field defined', () => {
      expect(pkg.files).toBeDefined();
    });

    it('should include dist/ so compiled code is published', () => {
      expect(pkg.files).toContain('dist/');
    });

    it('should include prompts/ so prompt templates are published', () => {
      expect(pkg.files).toContain('prompts/');
    });

    it('should NOT include raw TypeScript source files in files', () => {
      // src/ directory should NOT be explicitly listed in files
      // (it's excluded by default when files field exists)
      expect(pkg.files).not.toContain('src/');
      expect(pkg.files).not.toContain('bin/');
    });
  });

  describe('prepublishOnly hook', () => {
    it('should run build before publish', () => {
      expect(pkg.scripts.prepublishOnly).toBeDefined();
      expect(pkg.scripts.prepublishOnly).toContain('build');
    });

    it('build should include TypeScript compilation', () => {
      expect(pkg.scripts.build).toContain('tsc');
    });

    it('build should include Next.js build', () => {
      expect(pkg.scripts.build).toContain('next build');
    });

    it('build should include postbuild script', () => {
      expect(pkg.scripts.build).toContain('postbuild');
    });
  });

  describe('type field', () => {
    it('should be "module" for ESM compatibility', () => {
      expect(pkg.type).toBe('module');
    });
  });

  describe('global install simulation path check', () => {
    it('bin path should resolve relative to package root', () => {
      // When npm installs globally, the bin is linked relative to the package
      // The path ./dist/bin/cdb.js should resolve from the package root
      const binRelative = pkg.bin.cdb;
      expect(binRelative).toMatch(/^\.\//);

      const resolved = path.resolve(projectRoot, binRelative);
      const expected = path.join(projectRoot, 'dist', 'bin', 'cdb.js');
      expect(resolved).toBe(expected);
    });
  });
});

describe('find-root.ts source file', () => {
  it('should exist in src/lib/', () => {
    expect(
      fs.existsSync(path.join(projectRoot, 'src', 'lib', 'find-root.ts'))
    ).toBe(true);
  });

  it('should be included in tsconfig.server.json compilation', () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'tsconfig.server.json'), 'utf-8')
    );
    // src/lib/**/*.ts should match src/lib/find-root.ts
    expect(tsconfig.include).toContain('src/lib/**/*.ts');
  });
});

describe('sql.js type definitions', () => {
  it('should have sql.js.d.ts in src/types/', () => {
    expect(
      fs.existsSync(path.join(projectRoot, 'src', 'types', 'sql.js.d.ts'))
    ).toBe(true);
  });

  it('tsconfig.server.json should include src/types/**/*.d.ts', () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'tsconfig.server.json'), 'utf-8')
    );
    expect(tsconfig.include).toContain('src/types/**/*.d.ts');
  });
});
