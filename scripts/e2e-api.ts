import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dir, '..');
const baselineDbPath = resolve(root, 'packages/db/sqlite.db');

const port = process.env.PORT ?? '3001';
const dbPath = process.env.DATABASE_URL ?? resolve(tmpdir(), 'sveltekit-orpc-typia.e2e.sqlite');

mkdirSync(dirname(dbPath), { recursive: true });
copyFileSync(baselineDbPath, dbPath);

const child = Bun.spawn({
  cwd: root,
  cmd: ['bun', 'run', '--cwd', 'apps/api', 'start'],
  env: {
    ...process.env,
    PORT: port,
    DATABASE_URL: dbPath,
  },
  stdout: 'inherit',
  stderr: 'inherit',
});

// Keep the process alive as long as the child is running.
process.exit(await child.exited);

