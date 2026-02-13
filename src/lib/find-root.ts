import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

/**
 * Find the project root directory by searching upward for package.json.
 *
 * This works regardless of whether the code is running from the TypeScript
 * source (`src/lib/`) or from the compiled output (`dist/src/lib/`), making
 * it safe for both local development and npm-installed usage.
 *
 * @param referenceUrl - Pass `import.meta.url` from the calling module
 * @returns Absolute path to the project root (directory containing package.json)
 */
export function findProjectRoot(referenceUrl: string): string {
  let dir = dirname(fileURLToPath(referenceUrl));

  // Walk up the directory tree until we find a package.json with our package name
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }

  // Fallback: use process.cwd()
  return process.cwd();
}
