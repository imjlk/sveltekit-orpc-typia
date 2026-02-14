import { RPCHandler } from '@orpc/server/fetch';

type CorsHeaders = Record<string, string>;

export type OrpcFetchHandlerOptions<TContext> = {
  prefix?: string;
  healthPath?: string;
  corsHeaders?: CorsHeaders;
  context?: TContext;
  createContext?: (request: Request) => TContext | Promise<TContext>;
};

const defaultCorsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const createOrpcFetchHandler = <TContext extends Record<string, unknown> = Record<string, never>>(
  router: unknown,
  options: OrpcFetchHandlerOptions<TContext> = {},
) => {
  const rpcHandler = new RPCHandler<TContext>(router as never);
  const prefix = options.prefix ?? '/rpc';
  const healthPath = options.healthPath ?? '/health';
  const corsHeaders = options.corsHeaders ?? defaultCorsHeaders;

  return async (request: Request): Promise<Response> => {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === healthPath) {
      return new Response('ok', { headers: corsHeaders });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const context =
      options.createContext !== undefined
        ? await options.createContext(request)
        : (options.context ?? ({} as TContext));

    const result = await rpcHandler.handle(
      request,
      {
        prefix,
        context,
      } as never,
    );

    if (!result.matched) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    const responseHeaders = new Headers(result.response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }

    return new Response(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  };
};
