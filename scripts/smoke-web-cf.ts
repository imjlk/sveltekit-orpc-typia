import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(import.meta.dir, '..');
const port = Number(process.env.PORT ?? 5173);

const persistDir = mkdtempSync(resolve(tmpdir(), 'sveltekit-orpc-typia.cf-state.'));
const drizzleDir = resolve(root, 'packages/db/drizzle');
const webCwd = resolve(root, 'apps/web');

const log = (...args: unknown[]) => console.log('[smoke:web:cf]', ...args);

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

const waitForRpc = async () => {
  const url = `http://127.0.0.1:${port}/rpc/post/list`;
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        await sleep(200);
        continue;
      }
      const json = await res.json();
      if (json && typeof json === 'object' && 'json' in json) return;
    } catch {
      // ignore
    }
    await sleep(200);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

try {
  log('persistDir:', persistDir);

  // Build Pages output.
  await run(['bun', 'run', '--cwd', webCwd, 'build']);

  // Bootstrap local D1 schema by applying drizzle SQL migrations into the same persistence directory
  // used by `wrangler pages dev`.
  const migrationFiles = readdirSync(drizzleDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => resolve(drizzleDir, f));

  if (migrationFiles.length === 0) {
    throw new Error(`No migration SQL files found in ${drizzleDir}`);
  }

  for (const file of migrationFiles) {
    log('apply migration:', file);
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
      file,
      '--yes',
    ]);
  }

  // Start Pages dev server with a local D1 binding.
  const wrangler = Bun.spawn({
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

  try {
    await waitForRpc();
    log('OK: /rpc is responding with expected JSON wrapper');
  } finally {
    try {
      wrangler.kill('SIGTERM');
    } catch {
      // ignore
    }
    await wrangler.exited;
  }

  process.exit(0);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  // Keep the directory for debugging if explicitly requested.
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
