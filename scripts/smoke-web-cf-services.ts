import { mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

import { applyLocalD1Migrations } from './_cf-d1-migrations';

const root = resolve(import.meta.dir, '..');

const port = Number(process.env.PORT ?? 5173);
const contentPort = Number(process.env.CONTENT_PORT ?? 8788);
const metaPort = Number(process.env.META_PORT ?? 8789);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');

const persistDir = mkdtempSync(resolve(tmpdir(), 'sveltekit-orpc-typia.cf-services.'));

const workerContentCwd = resolve(root, 'apps/worker-content');
const workerMetaCwd = resolve(root, 'apps/worker-meta');

const workerContentName = 'sveltekit-orpc-typia-worker-content';
const workerMetaName = 'sveltekit-orpc-typia-worker-meta';

const log = (...args: unknown[]) => console.log('[smoke:web:cf:services]', ...args);

const waitFor = async (label: string, fn: () => Promise<boolean>) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if (await fn()) return;
    } catch {
      // ignore
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const spawn = (name: string, cmd: string[], cwd: string) => {
  const child = Bun.spawn({
    cmd,
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
  log('spawn:', name, cmd.join(' '));
  return child;
};

const kill = async (child: ReturnType<typeof Bun.spawn> | null) => {
  if (!child) return;
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
};

try {
  log('persistDir:', persistDir);

  // Build Pages output.
  {
    const child = spawn('web:build', ['bun', 'run', '--cwd', webCwd, 'build'], root);
    const code = await child.exited;
    if (code !== 0) throw new Error(`web build failed (${code})`);
  }

  // Prepare local D1 schema once.
  await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });

  const contentWorker = spawn(
    'worker:content',
    [
      'bunx',
      '--silent',
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
      '--var',
      'ORPC_DEBUG_UPSTREAM=1',
    ],
    workerContentCwd,
  );

  const metaWorker = spawn(
    'worker:meta',
    [
      'bunx',
      '--silent',
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
      '--var',
      'ORPC_DEBUG_UPSTREAM=1',
    ],
    workerMetaCwd,
  );

  const pages = spawn(
    'pages',
    [
      'bunx',
      '--silent',
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
      '--service',
      `ORPC_POST=${workerContentName}`,
      '--service',
      `ORPC_COMMENT=${workerContentName}`,
      '--service',
      `ORPC_CATEGORY=${workerMetaName}`,
      '--service',
      `ORPC_TAG=${workerMetaName}`,
    ],
    root,
  );

  try {
    const base = `http://127.0.0.1:${port}`;

    await waitFor('/rpc/post/list routes to worker-content', async () => {
      const res = await fetch(`${base}/rpc/post/list`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) return false;
      return res.headers.get('x-orpc-upstream') === 'worker-content';
    });

    await waitFor('/rpc/tag/list routes to worker-meta', async () => {
      const res = await fetch(`${base}/rpc/tag/list`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) return false;
      return res.headers.get('x-orpc-upstream') === 'worker-meta';
    });

    await waitFor('/api/post/list routes to worker-content', async () => {
      const res = await fetch(`${base}/api/post/list`, { method: 'GET' });
      if (!res.ok) return false;
      return res.headers.get('x-orpc-upstream') === 'worker-content';
    });

    log('OK');
  } finally {
    await kill(pages);
    await kill(contentWorker);
    await kill(metaWorker);
  }

  process.exit(0);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  if (!process.env.KEEP_CF_STATE) {
    try {
      rmSync(persistDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  } else {
    log('KEEP_CF_STATE=1: not deleting', persistDir);
  }
}

