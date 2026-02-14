import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ProcSpec = {
  name: string;
  cmd: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
};

const root = resolve(import.meta.dir, '..');

const port = Number(process.env.PORT ?? 5173);
const contentPort = Number(process.env.CONTENT_PORT ?? 8788);
const metaPort = Number(process.env.META_PORT ?? 8789);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');

// Shared persistence directory so Pages + both Workers see the same local D1 database.
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');
const appliedMigrationsPath = resolve(persistDir, '.drizzle-migrations.applied.json');

const workerContentName = 'sveltekit-orpc-typia-worker-content';
const workerMetaName = 'sveltekit-orpc-typia-worker-meta';

const log = (...args: unknown[]) => console.log('[dev:web:cf:services]', ...args);

const prefixLine = (name: string, line: string) => {
  const trimmed = line.replace(/\r?\n$/, '');
  if (!trimmed) return;
  process.stdout.write(`[${name}] ${trimmed}\n`);
};

const pipeStream = async (name: string, stream: ReadableStream<Uint8Array> | null) => {
  if (!stream) return;
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    while (true) {
      const idx = buf.indexOf('\n');
      if (idx === -1) break;
      const line = buf.slice(0, idx + 1);
      buf = buf.slice(idx + 1);
      prefixLine(name, line);
    }
  }

  if (buf) prefixLine(name, buf);
};

const spawnPrefixed = (spec: ProcSpec) => {
  const child = Bun.spawn({
    cmd: spec.cmd,
    cwd: spec.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: spec.env ?? process.env,
  });

  void pipeStream(spec.name, child.stdout);
  void pipeStream(spec.name, child.stderr);

  return child;
};

const run = async (cmd: string[], cwd: string) => {
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
    await run(
      [
        'bunx',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--local',
        '--persist-to',
        persistDir,
        '--file',
        abs,
        '--yes',
      ],
      webCwd,
    );

    applied.push(file);
    writeApplied(applied);
  }
};

const children: Array<ReturnType<typeof Bun.spawn>> = [];

const shutdown = () => {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
};

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(143);
});

try {
  log('persistDir:', persistDir);

  // Build Pages output.
  await run(['bun', 'run', '--cwd', webCwd, 'build'], root);

  // Prepare local D1 schema once, then let the dev servers reuse it.
  await applyPendingMigrations();

  children.push(
    spawnPrefixed({
      name: 'worker:content',
      cwd: resolve(root, 'apps/worker-content'),
      cmd: [
        'bunx',
        'wrangler',
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        String(contentPort),
        '--persist-to',
        persistDir,
        '--log-level',
        'warn',
      ],
    }),
  );

  children.push(
    spawnPrefixed({
      name: 'worker:meta',
      cwd: resolve(root, 'apps/worker-meta'),
      cmd: [
        'bunx',
        'wrangler',
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        String(metaPort),
        '--persist-to',
        persistDir,
        '--log-level',
        'warn',
      ],
    }),
  );

  children.push(
    spawnPrefixed({
      name: 'pages',
      cwd: webCwd,
      cmd: [
        'bunx',
        'wrangler',
        'pages',
        'dev',
        '.svelte-kit/cloudflare',
        '--ip',
        '127.0.0.1',
        '--port',
        String(port),
        '--persist-to',
        persistDir,
        '--log-level',
        'warn',
        '--service',
        `ORPC_POST=${workerContentName}`,
        '--service',
        `ORPC_COMMENT=${workerContentName}`,
        '--service',
        `ORPC_CATEGORY=${workerMetaName}`,
        '--service',
        `ORPC_TAG=${workerMetaName}`,
      ],
    }),
  );

  // Keep alive until a child exits.
  await Promise.race(children.map((c) => c.exited));
  shutdown();
  process.exit(1);
} catch (err) {
  shutdown();
  console.error(err);
  process.exit(1);
}

