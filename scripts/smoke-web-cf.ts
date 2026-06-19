import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = resolve(import.meta.dir, '..');
const port = Number(process.env.PORT ?? 5273);
const authHasherPort = Number(process.env.AUTH_HASHER_PORT ?? 8890);
const ogWorkerPort = Number(process.env.OG_WORKER_PORT ?? 8891);
const persistDir = mkdtempSync(resolve(tmpdir(), 'cloudflare-first-starter.cf-state.'));
const baseUrl = `http://127.0.0.1:${port}`;
const defaultBetterAuthSecret = process.env.BETTER_AUTH_SECRET ?? 'dev-better-auth-secret-change-me-32-bytes';

const log = (...args: unknown[]) => console.log('[smoke:web:cf]', ...args);

let stack: ReturnType<typeof Bun.spawn> | null = null;
let stackExit: number | null = null;

const fetchWithTimeout = async (input: string | URL, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
};

const waitFor = async (label: string, fn: () => Promise<boolean>, timeoutMs = 150_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (stackExit !== null) {
      throw new Error(`Cloudflare stack exited early with code ${stackExit} while waiting for ${label}`);
    }

    try {
      if (await fn()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  throw lastError ?? new Error(`Timed out waiting for ${label}`);
};

const expectStatus = async (
  path: string,
  expected: number | ((status: number) => boolean),
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetchWithTimeout(`${baseUrl}${path}`, { redirect: 'manual', ...init });
  const ok = typeof expected === 'number' ? response.status === expected : expected(response.status);
  if (!ok) throw new Error(`Expected ${path} status ${String(expected)}, got ${response.status}: ${await response.text()}`);
  log('ok', path, response.status);
  return response;
};

const expectOpenApiJson = async (path: string) => {
  const response = await expectStatus(path, 200);
  const json = await response.json() as { openapi?: unknown; paths?: unknown };
  if (json.openapi !== '3.1.1' || typeof json.paths !== 'object' || json.paths === null) {
    throw new Error(`Unexpected OpenAPI payload from ${path}`);
  }
};

const expectRpcEnvelope = async () => {
  const response = await expectStatus('/rpc/post/list', (status) => status === 200 || status === 401, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  const json = await response.json().catch(() => null);
  if (!json || typeof json !== 'object' || (!('json' in json) && !('error' in json))) {
    throw new Error('Expected Standard RPC response envelope from /rpc/post/list');
  }
};

const expectAuthHasherMetadata = async () => {
  const response = await fetchWithTimeout(`http://127.0.0.1:${authHasherPort}/`);
  if (!response.ok) throw new Error(`AUTH_HASHER metadata failed (${response.status}): ${await response.text()}`);
  const json = await response.json() as { rpc?: unknown };
  if (!Array.isArray(json.rpc) || json.rpc[0] !== 'hashPassword' || json.rpc[1] !== 'verifyPassword') {
    throw new Error('AUTH_HASHER metadata did not expose expected RPC methods');
  }
  log('ok AUTH_HASHER metadata', response.status);
};

const expectOgImage = async () => {
  const response = await expectStatus(
    '/og.png?title=Cloudflare%20First%20Starter&subtitle=Smoke%20test&theme=ocean&align=center',
    200,
  );
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/png')) throw new Error(`Expected image/png from OG route, got ${contentType || '(missing)'}`);
  log('ok OG image', contentType);
};

try {
  log('persistDir:', persistDir);
  stack = Bun.spawn({
    cmd: ['bun', 'scripts/dev-cloudflare-stack.ts'],
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      CF_PERSIST_DIR: persistDir,
      PORT: String(port),
      PAGES_INSPECTOR_PORT: process.env.PAGES_INSPECTOR_PORT ?? '9332',
      AUTH_HASHER_PORT: String(authHasherPort),
      AUTH_HASHER_INSPECTOR_PORT: process.env.AUTH_HASHER_INSPECTOR_PORT ?? '9333',
      OG_WORKER_PORT: String(ogWorkerPort),
      OG_WORKER_INSPECTOR_PORT: process.env.OG_WORKER_INSPECTOR_PORT ?? '9334',
      BETTER_AUTH_URL: baseUrl,
      BETTER_AUTH_SECRET: defaultBetterAuthSecret,
      ORPC_DB_DRIVER: 'd1',
      AUTH_HASHER_ENABLE_METADATA_ROUTE: 'true',
    },
  });
  void stack.exited.then((code) => {
    stackExit = code;
  });

  await waitFor('web Pages dev', async () => {
    const response = await fetchWithTimeout(baseUrl, { redirect: 'manual' }, 5_000);
    return response.status < 500;
  });

  await expectStatus('/', 200);
  await expectRpcEnvelope();
  await expectOpenApiJson('/openapi/openapi.api.json');
  await expectOpenApiJson('/openapi/openapi.rpc.json');
  await expectAuthHasherMetadata();
  await expectOgImage();
  log('OK: Cloudflare Pages smoke passed');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  if (stack) {
    try {
      stack.kill('SIGTERM');
    } catch {
      // ignore
    }
    await stack.exited.catch(() => undefined);
  }

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
