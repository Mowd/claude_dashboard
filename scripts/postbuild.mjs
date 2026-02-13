#!/usr/bin/env node

/**
 * Post-build script: inject shebang into dist/bin/cdb.js and set executable permission.
 *
 * TypeScript compiler strips the shebang line (`#!/usr/bin/env node`) during
 * compilation. This script re-adds it so that the CLI entry point works
 * correctly when installed via `npm install -g`.
 */

import { readFileSync, writeFileSync, chmodSync, rmSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const cdbPath = join(projectRoot, 'dist', 'bin', 'cdb.js');

const SHEBANG = '#!/usr/bin/env node\n';

try {
  let content = readFileSync(cdbPath, 'utf-8');

  // Only add shebang if not already present
  if (!content.startsWith('#!')) {
    content = SHEBANG + content;
    writeFileSync(cdbPath, content, 'utf-8');
    console.log('[postbuild] Injected shebang into dist/bin/cdb.js');
  } else {
    console.log('[postbuild] Shebang already present in dist/bin/cdb.js');
  }

  // Ensure the file is executable (rwxr-xr-x)
  chmodSync(cdbPath, 0o755);
  console.log('[postbuild] Set executable permission on dist/bin/cdb.js');
} catch (err) {
  console.error('[postbuild] Error:', err.message);
  process.exit(1);
}

// --- Clean up dev-only artifacts from .next/static/ ---

try {
  // Remove hot-update files from .next/static/webpack/
  const webpackDir = join(projectRoot, '.next', 'static', 'webpack');
  if (existsSync(webpackDir)) {
    const hotFiles = readdirSync(webpackDir).filter(f => f.includes('.hot-update.'));
    for (const f of hotFiles) {
      rmSync(join(webpackDir, f));
    }
    if (hotFiles.length > 0) {
      console.log(`[postbuild] Removed ${hotFiles.length} hot-update file(s) from .next/static/webpack/`);
    }
  }

  // Remove .next/static/development/ directory
  const devDir = join(projectRoot, '.next', 'static', 'development');
  if (existsSync(devDir)) {
    rmSync(devDir, { recursive: true });
    console.log('[postbuild] Removed .next/static/development/');
  }
} catch (err) {
  // Non-fatal: warn but don't fail the build
  console.warn('[postbuild] Warning: failed to clean dev artifacts:', err.message);
}
