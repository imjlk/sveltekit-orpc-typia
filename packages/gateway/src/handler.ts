// @ts-expect-error Workspace package intentionally avoids hard runtime dependency on SvelteKit.
import type { RequestEvent } from '@sveltejs/kit';

import { resolveUpstream } from './resolver';
import type { GatewayKind, PlatformLike } from './types';
import { isD1Database, resolveNodeEnv, resolvePlatformEnv } from './utils';

type LocalHandlers = {
  rpc: (request: Request) => Promise<Response>;
  api: (request: Request) => Promise<Response>;
};

type RequestHandler = (event: RequestEvent) => Response | Promise<Response>;

type GatewayHandlerOptions = {
  isDev?: boolean;
};

let localHandlersPromise: Promise<LocalHandlers> | null = null;

export const getLocalHandlers = async (
  platform: RequestEvent['platform'],
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
        const d1ModuleId = '@repo/db/d1';
        const [{ createD1Db }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
          await Promise.all([import(d1ModuleId), import('@repo/api')]);

        const db = createD1Db(dbBinding);
        const router = createAppRouter(db);

        return {
          rpc: createOrpcFetchHandler(router, { prefix: '/rpc', context: {} }),
          api: createOpenApiFetchHandler(router, { prefix: '/api', context: {} }),
        };
      }
    }

    if (!isDev) {
      const dbBindingName = typeof env?.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
      throw new Error(`Missing D1 binding "${dbBindingName}" (set ORPC_DB_BINDING or bind as DB), or disable ORPC_IN_PROCESS.`);
    }

    const bunDbModuleId = '@repo/db/bun';
    const migrationsModuleId = '@repo/db/migrations';
    const [{ createDb }, { migrateBunSqlite }, { createAppRouter, createOrpcFetchHandler, createOpenApiFetchHandler }] =
      await Promise.all([import(bunDbModuleId), import(migrationsModuleId), import('@repo/api')]);

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

export const createGatewayHandler = (kind: GatewayKind, options: GatewayHandlerOptions = {}): RequestHandler => {
  const forward: RequestHandler = async (event) => {
    const { fetch, params, platform, request, url } = event;
    const path = params.path ? `/${params.path}` : '';
    const routerName = params.path?.split('/')[0];
    const upstream = resolveUpstream(kind, { platform: platform as PlatformLike, routerName });

    if (upstream.kind === 'local') {
      try {
        const handlers = await getLocalHandlers(platform, options);
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

export type { GatewayHandlerOptions, LocalHandlers };
