import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const port = Number(process.env.PORT ?? 5173);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');

// Default wrangler persistence directory. Can be overridden for multi-process dev.
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');
const appliedMigrationsPath = resolve(persistDir, '.drizzle-migrations.applied.json');

const log = (...args: unknown[]) => console.log('[dev:web:cf]', ...args);

const run = async (cmd: string[], cwd = root) => {
  const child = Bun.spawn({
    cmd,
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
  const code = await child.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(' ')}`);
  }
};

const readApplied = (): string[] => {
  try {
    const text = readFileSync(appliedMigrationsPath, 'utf8');
    const json = JSON.parse(text) as unknown;
    if (Array.isArray(json) && json.every((v) => typeof v === 'string')) return json;
  } catch {
    // ignore
  }
  return [];
};

const writeApplied = (applied: string[]) => {
  writeFileSync(appliedMigrationsPath, JSON.stringify(applied, null, 2) + '\n', 'utf8');
};

const listMigrations = (): string[] =>
  readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

const applyPendingMigrations = async () => {
  mkdirSync(persistDir, { recursive: true });

  const migrationFiles = listMigrations();
  if (migrationFiles.length === 0) {
    throw new Error(`No migration SQL files found in ${drizzleDir}`);
  }

  const applied = readApplied();
  const pending = migrationFiles.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    log('migrations: up-to-date');
    return;
  }

  for (const file of pending) {
    const abs = resolve(drizzleDir, file);
    log('apply migration:', file);
    try {
      await run([
        'bunx',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--cwd',
        webCwd,
        '--local',
        '--persist-to',
        persistDir,
        '--file',
        abs,
        '--yes',
      ]);
    } catch (err) {
      // The local D1 database might already have the schema but the marker file is missing.
      // The simplest recovery path is to reset the state directory.
      log('migration failed. If this is due to an existing local D1 schema, run: bun run dev:web:cf:reset');
      throw err;
    }

    applied.push(file);
    writeApplied(applied);
  }
};

let child: ReturnType<typeof Bun.spawn> | null = null;

const shutdown = async (code: number) => {
  if (child) {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
    try {
      await child.exited;
    } catch {
      // ignore
    }
    child = null;
  }
  process.exit(code);
};

process.on('SIGINT', () => void shutdown(130));
process.on('SIGTERM', () => void shutdown(143));

try {
  log('persistDir:', persistDir);

  // Build Pages output.
  await run(['bun', 'run', '--cwd', webCwd, 'build']);

  // Ensure D1 schema is applied into the same persistence directory used by `wrangler pages dev`.
  await applyPendingMigrations();

  child = Bun.spawn({
    cmd: [
      'bunx',
      'wrangler',
      'pages',
      'dev',
      '.svelte-kit/cloudflare',
      '--cwd',
      webCwd,
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--persist-to',
      persistDir,
      '--log-level',
      'warn',
    ],
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });

  const code = await child.exited;
  await shutdown(code === 0 ? 0 : 1);
} catch (err) {
  console.error(err);
  await shutdown(1);
}

