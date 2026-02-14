import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

export type GatewayKind = 'rpc' | 'api';

const DEFAULT_UPSTREAM_URL: Record<GatewayKind, string> = {
  rpc: 'http://127.0.0.1:3000/rpc',
  api: 'http://127.0.0.1:3000/api',
};

type ServiceBinding = {
  fetch: (request: Request) => Promise<Response>;
};

type D1DatabaseLike = {
  prepare: (query: string) => unknown;
};

type Upstream =
  | { kind: 'binding'; binding: ServiceBinding }
  | { kind: 'url'; url: string }
  | { kind: 'local' };

const normalizeUpstreamUrl = (kind: GatewayKind, value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '');

  if (kind === 'rpc') {
    return trimmed.endsWith('/rpc') ? trimmed : `${trimmed}/rpc`;
  }

  if (trimmed.endsWith('/api')) return trimmed;
  // Allow reusing /rpc URLs by mapping to /api.
  if (trimmed.endsWith('/rpc')) return `${trimmed.slice(0, -4)}/api`;
  return `${trimmed}/api`;
};

const isServiceBinding = (value: unknown): value is ServiceBinding =>
  !!value && typeof value === 'object' && 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';

const isD1Database = (value: unknown): value is D1DatabaseLike =>
  !!value && typeof value === 'object' && 'prepare' in value && typeof (value as { prepare?: unknown }).prepare === 'function';

const resolvePlatformEnv = (platform: RequestEvent['platform']): Record<string, unknown> | undefined =>
  (platform as { env?: Record<string, unknown> } | undefined)?.env;

const resolveNodeEnv = (): Record<string, string | undefined> | undefined =>
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

const isTruthy = (value: unknown): boolean =>
  value === '1' || value === 'true' || value === 'TRUE' || value === 'yes' || value === 'YES';

const resolvePlatformBinding = (env: Record<string, unknown> | undefined, key: string): ServiceBinding | undefined => {
  const direct = env?.[key];
  if (isServiceBinding(direct)) return direct;

  const bindingName = env?.[`${key}_BINDING`];
  if (typeof bindingName !== 'string') return undefined;

  const indirect = env?.[bindingName];
  return isServiceBinding(indirect) ? indirect : undefined;
};

const resolveNodeBaseUrl = (): string | undefined => {
  const env = resolveNodeEnv();
  return env?.ORPC_API_URL ?? env?.VITE_API_URL;
};

const resolveUpstream = (
  kind: GatewayKind,
  platform: RequestEvent['platform'],
  routerName: string | undefined,
): Upstream => {
  const env = resolvePlatformEnv(platform);
  const nodeEnv = resolveNodeEnv();
  const upper = routerName?.toUpperCase();
  const inProcessEnabled = isTruthy(env?.ORPC_IN_PROCESS) || isTruthy(nodeEnv?.ORPC_IN_PROCESS);

  // Per-router binding via service bindings.
  if (upper) {
    const binding = resolvePlatformBinding(env, `ORPC_${upper}`);
    if (binding) return { kind: 'binding', binding };

    const url = env?.[`ORPC_${upper}_URL`];
    if (typeof url === 'string') return { kind: 'url', url: normalizeUpstreamUrl(kind, url) };
  }

  // Default binding.
  const defaultBinding = resolvePlatformBinding(env, 'ORPC_DEFAULT') ?? resolvePlatformBinding(env, 'ORPC_API');
  if (defaultBinding) return { kind: 'binding', binding: defaultBinding };

  // Default URL (Cloudflare env var or Node env var), if configured.
  const configuredUrl =
    (typeof env?.ORPC_API_URL === 'string' ? env.ORPC_API_URL : undefined) ??
    (typeof env?.ORPC_DEFAULT_URL === 'string' ? env.ORPC_DEFAULT_URL : undefined) ??
    resolveNodeBaseUrl();

  if (configuredUrl) {
    return { kind: 'url', url: normalizeUpstreamUrl(kind, configuredUrl) };
  }

  if (inProcessEnabled) {
    return { kind: 'local' };
  }

  return { kind: 'url', url: normalizeUpstreamUrl(kind, DEFAULT_UPSTREAM_URL[kind]) };
};

type LocalHandlers = {
  rpc: (request: Request) => Promise<Response>;
  api: (request: Request) => Promise<Response>;
};

let localHandlersPromise: Promise<LocalHandlers> | null = null;

const getLocalHandlers = async (platform: RequestEvent['platform']): Promise<LocalHandlers> => {
  if (localHandlersPromise) return localHandlersPromise;

  localHandlersPromise = (async () => {
    const env = resolvePlatformEnv(platform);

    // Cloudflare runtime (built output): use D1 binding.
    // In local Vite dev, adapter-cloudflare can provide a miniflare D1 binding without schema;
    // prefer Bun sqlite there and validate D1 separately via `wrangler pages dev`.
    if (!import.meta.env.DEV && env) {
      const dbBindingName = typeof env.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
      const dbBinding = env[dbBindingName];
      if (isD1Database(dbBinding)) {
        const [{ createD1Db }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
          await Promise.all([import('@repo/db/d1'), import('@repo/api')]);

        const db = createD1Db(dbBinding);
        const router = createAppRouter(db);

        return {
          rpc: createOrpcFetchHandler(router, { prefix: '/rpc', context: {} }),
          api: createOpenApiFetchHandler(router, { prefix: '/api', context: {} }),
        };
      }
    }

    // Local dev (Bun runtime): use sqlite via bun:sqlite.
    if (!import.meta.env.DEV) {
      const dbBindingName = typeof env?.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
      throw new Error(
        `Missing D1 binding "${dbBindingName}" (set ORPC_DB_BINDING or bind as DB), or disable ORPC_IN_PROCESS.`,
      );
    }

    const [{ createDb }, { migrateBunSqlite }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
      await Promise.all([import('@repo/db/bun'), import('@repo/db/migrations'), import('@repo/api')]);

    const nodeEnv = resolveNodeEnv();
    const dbUrl =
      typeof nodeEnv?.DATABASE_URL === 'string' && nodeEnv.DATABASE_URL.trim().length > 0 ? nodeEnv.DATABASE_URL : undefined;

    const db = createDb(dbUrl);
    migrateBunSqlite(db);
    const router = createAppRouter(db);

    return {
      rpc: createOrpcFetchHandler(router, { prefix: '/rpc', context: {} }),
      api: createOpenApiFetchHandler(router, { prefix: '/api', context: {} }),
    };
  })();

  return localHandlersPromise;
};

export const createGatewayHandler = (kind: GatewayKind): RequestHandler => {
  const forward: RequestHandler = async ({ fetch, params, platform, request, url }) => {
    const path = params.path ? `/${params.path}` : '';
    const routerName = params.path?.split('/')[0];
    const upstream = resolveUpstream(kind, platform, routerName);

    if (upstream.kind === 'local') {
      try {
        const handlers = await getLocalHandlers(platform);
        return kind === 'rpc' ? handlers.rpc(request) : handlers.api(request);
      } catch (error) {
        console.error(`Failed to handle ${kind.toUpperCase()} request in-process:`, error);
        return new Response('Bad Gateway', { status: 502 });
      }
    }

    const baseUrl = upstream.kind === 'url' ? upstream.url : `https://orpc.local/${kind}`;
    const targetUrl = new URL(`${baseUrl}${path}`);
    targetUrl.search = url.search;

    const headers = new Headers(request.headers);
    headers.delete('host');

    const init: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const requestBody = await request.arrayBuffer();
      init.body = requestBody.byteLength > 0 ? requestBody : undefined;
    }

    try {
      const response =
        upstream.kind === 'binding'
          ? await upstream.binding.fetch(new Request(targetUrl, init))
          : await fetch(targetUrl, init);

      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      console.error(`Failed to forward ${kind.toUpperCase()} request:`, error);
      return new Response('Bad Gateway', { status: 502 });
    }
  };

  return forward;
};

