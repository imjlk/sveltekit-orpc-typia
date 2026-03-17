import { resolveUpstream } from './resolver';
import type { GatewayKind, PlatformLike } from './types';
import { isD1Database, resolveNodeEnv, resolvePlatformEnv } from './utils';

type LocalHandlers = {
  rpc: (request: Request) => Promise<Response>;
  api: (request: Request) => Promise<Response>;
};

type GatewayRequestEvent = {
  fetch: typeof fetch;
  params: Record<string, string | undefined>;
  platform?: PlatformLike;
  request: Request;
  url: URL;
};

type RequestHandler = (event: GatewayRequestEvent) => Response | Promise<Response>;

type GatewayHandlerOptions = {
  isDev?: boolean;
  getInternalHeaders?: (event: GatewayRequestEvent) => Promise<Record<string, string | undefined>>;
};

let localHandlersPromise: Promise<LocalHandlers> | null = null;

const importRuntimeModule = <T>(specifier: string): Promise<T> =>
  import(/* @vite-ignore */ specifier) as Promise<T>;

export const getLocalHandlers = async (
  platform: GatewayRequestEvent['platform'],
  options: GatewayHandlerOptions = {},
): Promise<LocalHandlers> => {
  if (localHandlersPromise) return localHandlersPromise;

  localHandlersPromise = (async () => {
    const env = resolvePlatformEnv(platform as PlatformLike);
    const isDev = options.isDev ?? false;

    if (!isDev && env) {
      const dbBindingName = typeof env.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
      const dbBinding = env[dbBindingName];
      if (isD1Database(dbBinding)) {
        const [{ createD1Db }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
          await Promise.all([import('@repo/db/d1'), import('@repo/api')]);

        const db = createD1Db(dbBinding);
        const router = createAppRouter(db);

        return {
          rpc: createOrpcFetchHandler(router, {
            prefix: '/rpc',
            createContext: (request) => import('@repo/api').then(({ createApiContext }) =>
              createApiContext(request, { env, allowDevFallback: isDev }),
            ),
          }),
          api: createOpenApiFetchHandler(router, {
            prefix: '/api',
            createContext: (request) => import('@repo/api').then(({ createApiContext }) =>
              createApiContext(request, { env, allowDevFallback: isDev }),
            ),
          }),
        };
      }
    }

    if (!isDev) {
      const dbBindingName = typeof env?.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
      throw new Error(`Missing D1 binding "${dbBindingName}" (set ORPC_DB_BINDING or bind as DB), or disable ORPC_IN_PROCESS.`);
    }

    const [{ createDb, defaultDbPath }, { migrateBunSqliteWithLock }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
      await Promise.all([
        importRuntimeModule<typeof import('@repo/db/bun')>('@repo/db/bun'),
        importRuntimeModule<typeof import('@repo/db/migrations')>('@repo/db/migrations'),
        import('@repo/api'),
      ]);

    const nodeEnv = resolveNodeEnv();
    const dbUrl =
      typeof nodeEnv?.DATABASE_URL === 'string' && nodeEnv.DATABASE_URL.trim().length > 0 ? nodeEnv.DATABASE_URL : defaultDbPath;

    const db = createDb(dbUrl);
    await migrateBunSqliteWithLock(db, dbUrl);
    const router = createAppRouter(db);

    return {
      rpc: createOrpcFetchHandler(router, {
        prefix: '/rpc',
        createContext: (request) =>
          import('@repo/api').then(({ createApiContext }) =>
            createApiContext(request, { env: nodeEnv, allowDevFallback: true }),
          ),
      }),
      api: createOpenApiFetchHandler(router, {
        prefix: '/api',
        createContext: (request) =>
          import('@repo/api').then(({ createApiContext }) =>
            createApiContext(request, { env: nodeEnv, allowDevFallback: true }),
          ),
      }),
    };
  })();

  return localHandlersPromise;
};

export const createGatewayHandler = (kind: GatewayKind, options: GatewayHandlerOptions = {}): RequestHandler => {
  const forward: RequestHandler = async (event) => {
    const { fetch, params, platform, request, url } = event;
    const path = params.path ? `/${params.path}` : '';
    const routerName = params.path?.split('/')[0];
    const upstream = resolveUpstream(kind, { platform: platform as PlatformLike, routerName });
    const headers = new Headers(request.headers);
    headers.delete('host');

    const internalHeaders = options.getInternalHeaders ? await options.getInternalHeaders(event) : {};
    for (const [key, value] of Object.entries(internalHeaders)) {
      if (typeof value === 'string' && value.length > 0) {
        headers.set(key, value);
      }
    }

    const requestWithHeaders = new Request(request, { headers });

    if (upstream.kind === 'local') {
      try {
        const handlers = await getLocalHandlers(platform, options);
        return kind === 'rpc' ? handlers.rpc(requestWithHeaders) : handlers.api(requestWithHeaders);
      } catch (error) {
        console.error(`Failed to handle ${kind.toUpperCase()} request in-process:`, error);
        return new Response('Bad Gateway', { status: 502 });
      }
    }

    const baseUrl = upstream.kind === 'url' ? upstream.url : `https://orpc.local/${kind}`;
    const targetUrl = new URL(`${baseUrl}${path}`);
    targetUrl.search = url.search;

    const init: RequestInit = {
      method: requestWithHeaders.method,
      headers,
    };

    if (requestWithHeaders.method !== 'GET' && requestWithHeaders.method !== 'HEAD') {
      const requestBody = await requestWithHeaders.arrayBuffer();
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

export type { GatewayHandlerOptions, LocalHandlers };
