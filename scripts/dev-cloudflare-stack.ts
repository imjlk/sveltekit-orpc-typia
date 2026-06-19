import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { applyLocalD1Migrations } from './_cf-d1-migrations';
import { createWranglerCommand } from './_wrangler-cli';

type Child = ReturnType<typeof Bun.spawn>;

type ProcessSpec = {
  name: string;
  cmd: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  startupDelayMs?: number;
};

const root = resolve(import.meta.dir, '..');
const webCwd = resolve(root, 'apps/web');
const dbCwd = resolve(root, 'packages/db');
const drizzleDir = resolve(root, 'packages/db/drizzle');
const webWranglerConfig = resolve(webCwd, 'wrangler.jsonc');
const authHasherCwd = resolve(root, 'apps/auth-hasher-worker');
const authHasherWranglerConfig = resolve(authHasherCwd, 'wrangler.toml');
const ogWorkerCwd = resolve(root, 'apps/worker-og');
const ogWorkerWranglerConfig = resolve(ogWorkerCwd, 'wrangler.toml');

const port = Number(process.env.PORT ?? 5173);
const authHasherPort = Number(process.env.AUTH_HASHER_PORT ?? 8790);
const ogWorkerPort = Number(process.env.OG_WORKER_PORT ?? 8791);
const authHasherInspectorPort = Number(process.env.AUTH_HASHER_INSPECTOR_PORT ?? 9233);
const ogWorkerInspectorPort = Number(process.env.OG_WORKER_INSPECTOR_PORT ?? 9234);
const pagesInspectorPort = Number(process.env.PAGES_INSPECTOR_PORT ?? 9232);
const persistDir = resolve(root, process.env.CF_PERSIST_DIR ?? 'apps/web/.wrangler/state');

const log = (...args: unknown[]) => console.log('[dev:cf:stack]', ...args);

const readConfigString = (configText: string, key: string): string | undefined => {
  const re = new RegExp(`^\\s*"?${key}"?\\s*[:=]\\s*"([^"]+)"\\s*,?\\s*$`, 'm');
  return configText.match(re)?.[1];
};

const bindingArgs = (keys: string[]): string[] =>
  keys.flatMap((key) => {
    const value = process.env[key];
    return value == null ? [] : ['--binding', `${key}=${value}`];
  });

const varArgs = (keys: string[]): string[] =>
  keys.flatMap((key) => {
    const value = process.env[key];
    return value == null ? [] : ['--var', `${key}:${value}`];
  });

const run = async (name: string, cmd: string[], cwd = root, env: Record<string, string | undefined> = process.env) => {
  log(name);
  const child = Bun.spawn({
    cmd,
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env,
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${name} failed with exit code ${code}: ${cmd.join(' ')}`);
};

const spawn = (spec: ProcessSpec): Child => {
  log('starting', spec.name);
  return Bun.spawn({
    cmd: spec.cmd,
    cwd: spec.cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      ...spec.env,
    },
  });
};

const stopAll = async (children: Child[]) => {
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // The process may have already exited.
    }
  }

  await Promise.all(children.map((child) => child.exited.catch(() => undefined)));
};

const readWorkerName = (filePath: string, fallback: string): string => {
  const name = readConfigString(readFileSync(filePath, 'utf8'), 'name');
  return name ?? fallback;
};

const prepareDatabase = async () => {
  await applyLocalD1Migrations({ webCwd, drizzleDir, persistDir, log });

  const wranglerConfigText = readFileSync(webWranglerConfig, 'utf8');
  const dbDriver = process.env.ORPC_DB_DRIVER ?? readConfigString(wranglerConfigText, 'ORPC_DB_DRIVER') ?? 'd1';
  const localConnectionString = readConfigString(wranglerConfigText, 'localConnectionString');

  if (dbDriver === 'hyperdrive' && localConnectionString) {
    await run('migrate local Hyperdrive/Postgres database', ['bun', 'run', 'db:migrate:pg'], dbCwd, {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? localConnectionString,
    });
  }
};

const main = async () => {
  const authHasherWorkerName = readWorkerName(authHasherWranglerConfig, 'cloudflare-first-starter-auth-hasher');
  const ogWorkerName = readWorkerName(ogWorkerWranglerConfig, 'cloudflare-first-starter-worker-og');
  const children: Child[] = [];
  let shuttingDown = false;

  const shutdown = async (code: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('stopping local Cloudflare stack');
    await stopAll(children);
    process.exit(code);
  };

  process.on('SIGINT', () => void shutdown(130));
  process.on('SIGTERM', () => void shutdown(143));

  try {
    log('persistDir:', persistDir);
    await run('build shared package', ['bun', 'run', '--cwd', 'packages/shared', 'build']);
    await run('build auth hasher Wasm kernel', ['bun', 'run', '--cwd', 'apps/auth-hasher-worker', 'build:kernel']);
    await run('build web Pages output', ['bun', 'run', '--cwd', 'apps/web', 'build']);
    await prepareDatabase();

    const serviceSpecs: ProcessSpec[] = [
      {
        name: 'AUTH_HASHER service binding',
        cwd: authHasherCwd,
        cmd: createWranglerCommand([
          'dev',
          '--local',
          '--ip',
          '127.0.0.1',
          '--port',
          String(authHasherPort),
          '--persist-to',
          persistDir,
          '--inspector-port',
          String(authHasherInspectorPort),
          '--log-level',
          'warn',
          ...varArgs([
            'AUTH_HASHER_PRESET_ID',
            'AUTH_HASHER_ARGON2_MEMORY_KIB',
            'AUTH_HASHER_ARGON2_TIME_COST',
            'AUTH_HASHER_ARGON2_PARALLELISM',
            'AUTH_HASHER_ARGON2_OUTPUT_LENGTH',
            'AUTH_HASHER_ENABLE_METADATA_ROUTE',
          ]),
        ], { cwd: authHasherCwd }),
        startupDelayMs: 1500,
      },
      {
        name: 'OG_WORKER service binding',
        cwd: ogWorkerCwd,
        cmd: createWranglerCommand([
          'dev',
          '--local',
          '--ip',
          '127.0.0.1',
          '--port',
          String(ogWorkerPort),
          '--persist-to',
          persistDir,
          '--inspector-port',
          String(ogWorkerInspectorPort),
          '--log-level',
          'warn',
        ], { cwd: ogWorkerCwd }),
        startupDelayMs: 1500,
      },
    ];

    for (const spec of serviceSpecs) {
      children.push(spawn(spec));
      await sleep(spec.startupDelayMs ?? 0);
    }

    children.push(spawn({
      name: 'web Pages dev',
      cwd: root,
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
        '--inspector-port',
        String(pagesInspectorPort),
        '--log-level',
        'warn',
        '--service',
        `AUTH_HASHER=${authHasherWorkerName}`,
        '--service',
        `OG_WORKER=${ogWorkerName}`,
        ...bindingArgs([
          'BETTER_AUTH_SECRET',
          'BETTER_AUTH_URL',
          'ORPC_DB_DRIVER',
          'OG_WORKER_BASE_URL',
          'AUTH_HASHER_PRESET_ID',
          'AUTH_HASHER_ARGON2_MEMORY_KIB',
          'AUTH_HASHER_ARGON2_TIME_COST',
          'AUTH_HASHER_ARGON2_PARALLELISM',
          'AUTH_HASHER_ARGON2_OUTPUT_LENGTH',
          'AUTH_HASHER_ENABLE_METADATA_ROUTE',
        ]),
      ], { cwd: webCwd }),
    }));

    log(`running. Web: http://127.0.0.1:${port}`);

    const firstExit = await Promise.race(
      children.map(async (child, index) => ({
        index,
        code: await child.exited,
      })),
    );

    if (!shuttingDown) {
      log(`process ${firstExit.index} exited with ${firstExit.code}`);
      await shutdown(firstExit.code === 0 ? 0 : 1);
    }
  } catch (error) {
    console.error(error);
    await shutdown(1);
  }
};

await main();
