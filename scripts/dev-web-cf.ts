import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { applyLocalD1Migrations } from './_cf-d1-migrations';
import { createWranglerCommand } from './_wrangler-cli';

const root = resolve(import.meta.dir, '..');
const port = Number(process.env.PORT ?? 5173);

const webCwd = resolve(root, 'apps/web');
const drizzleDir = resolve(root, 'packages/db/drizzle');
const dbCwd = resolve(root, 'packages/db');
const webWranglerConfig = resolve(webCwd, 'wrangler.jsonc');

// Default wrangler persistence directory. Can be overridden for multi-process dev.
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');

const log = (...args: unknown[]) => console.log('[dev:web:cf]', ...args);

const readConfigString = (configText: string, key: string): string | undefined => {
  const re = new RegExp(`^\\s*"?${key}"?\\s*[:=]\\s*"([^"]+)"\\s*,?\\s*$`, 'm');
  return configText.match(re)?.[1];
};

const run = async (cmd: string[], cwd = root, env: Record<string, string | undefined> = process.env) => {
  const child = Bun.spawn({
    cmd,
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });
  const code = await child.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(' ')}`);
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
  await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });

  const wranglerConfigText = readFileSync(webWranglerConfig, 'utf8');
  const dbDriver = readConfigString(wranglerConfigText, 'ORPC_DB_DRIVER') ?? 'd1';
  const localConnectionString = readConfigString(wranglerConfigText, 'localConnectionString');

  if (dbDriver === 'hyperdrive' && localConnectionString) {
    await run(['bun', 'run', 'db:migrate:pg'], dbCwd, {
      ...process.env,
      DATABASE_URL: localConnectionString,
    });
  }

  child = Bun.spawn({
    cmd: createWranglerCommand([
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
    ]),
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
