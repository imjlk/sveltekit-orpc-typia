import { createApiContext, createContentRouter, createOpenApiFetchHandler, createOrpcFetchHandler } from '@repo/api';
import { createD1Db } from '@repo/db/d1';

type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET?: string;
  ORPC_DEBUG_UPSTREAM?: string;
};

type Handlers = {
  rpc: (request: Request) => Promise<Response>;
  api: (request: Request) => Promise<Response>;
};

let handlersPromise: Promise<Handlers> | null = null;

const getHandlers = async (env: Env): Promise<Handlers> => {
  if (handlersPromise) return handlersPromise;

  handlersPromise = (async () => {
    if (!env.DB) {
      throw new Error('Missing D1 binding "DB"');
    }

    const db = createD1Db(env.DB);
    const router = createContentRouter(db);

    return {
      rpc: createOrpcFetchHandler(router, {
        prefix: '/rpc',
        createContext: (request) =>
          createApiContext(request, {
            env,
            allowDevFallback: ['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname),
          }),
      }),
      api: createOpenApiFetchHandler(router, {
        prefix: '/api',
        createContext: (request) =>
          createApiContext(request, {
            env,
            allowDevFallback: ['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname),
          }),
      }),
    };
  })();

  return handlersPromise;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/health') {
      return new Response('ok');
    }

    const handlers = await getHandlers(env);

    if (pathname.startsWith('/rpc')) {
      const res = await handlers.rpc(request);
      if (env.ORPC_DEBUG_UPSTREAM) {
        const headers = new Headers(res.headers);
        headers.set('x-orpc-upstream', 'worker-content');
        return new Response(res.body, { status: res.status, headers });
      }
      return res;
    }

    if (pathname.startsWith('/api')) {
      const res = await handlers.api(request);
      if (env.ORPC_DEBUG_UPSTREAM) {
        const headers = new Headers(res.headers);
        headers.set('x-orpc-upstream', 'worker-content');
        return new Response(res.body, { status: res.status, headers });
      }
      return res;
    }

    return new Response('Not Found', { status: 404 });
  },
};
