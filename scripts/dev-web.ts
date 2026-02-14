import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

type ProcSpec = {
  name: string;
  cmd: string[];
  env?: Record<string, string | undefined>;
};

const root = resolve(import.meta.dir, '..');
const sharedDistEntry = resolve(root, 'packages/shared/dist/index.js');
const baselineDbPath = resolve(root, 'packages/db/sqlite.db');

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
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
    env: spec.env ?? process.env,
  });

  void pipeStream(spec.name, child.stdout);
  void pipeStream(spec.name, child.stderr);

  return child;
};

const waitForSharedDist = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (existsSync(sharedDistEntry)) return;
    await sleep(200);
  }

  throw new Error(`Timed out waiting for ${sharedDistEntry}`);
};

const resolveDevDbPath = () => {
  const provided = process.env.DATABASE_URL;
  if (provided) return provided;

  return resolve(tmpdir(), 'sveltekit-orpc-typia.dev.sqlite');
};

const ensureDevDb = (dbPath: string) => {
  mkdirSync(dirname(dbPath), { recursive: true });
  if (existsSync(dbPath)) return;
  copyFileSync(baselineDbPath, dbPath);
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
  const dbPath = resolveDevDbPath();
  ensureDevDb(dbPath);

  children.push(spawnPrefixed({ name: 'shared', cmd: ['bun', 'run', '--cwd', 'packages/shared', 'dev'] }));
  await waitForSharedDist();

  children.push(
    spawnPrefixed({
      name: 'web',
      cmd: ['bun', 'run', '--cwd', 'apps/web', 'dev'],
      env: {
        ...process.env,
        ORPC_IN_PROCESS: process.env.ORPC_IN_PROCESS ?? '1',
        // Avoid accidental proxying when user has ORPC_API_URL set globally.
        ORPC_API_URL: '',
        VITE_API_URL: '',
        DATABASE_URL: dbPath,
      },
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

