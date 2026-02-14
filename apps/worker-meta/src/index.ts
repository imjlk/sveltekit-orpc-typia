import { createMetaRouter, createOpenApiFetchHandler, createOrpcFetchHandler } from '@repo/api';
import { createD1Db } from '@repo/db/d1';

type Env = {
  DB: D1Database;
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
    const router = createMetaRouter(db);

    return {
      rpc: createOrpcFetchHandler(router, { prefix: '/rpc', context: {} }),
      api: createOpenApiFetchHandler(router, { prefix: '/api', context: {} }),
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
      return handlers.rpc(request);
    }

    if (pathname.startsWith('/api')) {
      return handlers.api(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};

