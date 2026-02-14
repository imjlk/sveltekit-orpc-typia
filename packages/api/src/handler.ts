import { RPCHandler } from '@orpc/server/fetch';

type CorsHeaders = Record<string, string>;

export type OrpcFetchHandlerOptions<TContext> = {
  prefix?: string;
  healthPath?: string;
  /**
   * Extra headers applied to all responses (commonly used for CORS).
   *
   * Default: undefined (no CORS headers).
   */
  corsHeaders?: CorsHeaders;
  context?: TContext;
  createContext?: (request: Request) => TContext | Promise<TContext>;
};

export const createOrpcFetchHandler = <TContext extends Record<string, unknown> = Record<string, never>>(
  router: unknown,
  options: OrpcFetchHandlerOptions<TContext> = {},
) => {
  const rpcHandler = new RPCHandler<TContext>(router as never);
  const prefix = options.prefix ?? '/rpc';
  const healthPath = options.healthPath ?? '/health';
  const corsHeaders = options.corsHeaders;

  const applyCorsHeaders = (headers: Headers) => {
    if (!corsHeaders) return;
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }
  };

  return async (request: Request): Promise<Response> => {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === healthPath) {
      const headers = new Headers();
      applyCorsHeaders(headers);
      return new Response('ok', { headers });
    }

    if (request.method === 'OPTIONS') {
      const headers = new Headers();
      applyCorsHeaders(headers);
      return new Response(null, { status: 204, headers });
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
      const headers = new Headers();
      applyCorsHeaders(headers);
      return new Response('Not Found', { status: 404, headers });
    }

    const responseHeaders = new Headers(result.response.headers);
    applyCorsHeaders(responseHeaders);

    return new Response(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  };
};
