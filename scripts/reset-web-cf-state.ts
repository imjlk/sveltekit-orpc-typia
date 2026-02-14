import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

// Keep in sync with scripts/dev-web-cf.ts defaults.
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');

try {
  rmSync(persistDir, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log('[dev:web:cf:reset] removed:', persistDir);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}

