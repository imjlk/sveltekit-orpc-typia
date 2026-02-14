import { OpenAPIHandler } from '@orpc/openapi/fetch';

type CorsHeaders = Record<string, string>;

export type OpenApiFetchHandlerOptions<TContext> = {
  prefix?: string;
  healthPath?: string;
  /**
   * Extra headers applied to all responses (commonly used for CORS).
   *
   * Default: undefined (no CORS headers).
   */
  corsHeaders?: CorsHeaders;
  /**
   * When enabled, log unhandled procedure errors to stderr (useful in dev).
   *
   * Default: `process.env.NODE_ENV !== 'production'` when `process` is available.
   */
  logErrors?: boolean;
  context?: TContext;
  createContext?: (request: Request) => TContext | Promise<TContext>;
};

export const createOpenApiFetchHandler = <TContext extends Record<string, unknown> = Record<string, never>>(
  router: unknown,
  options: OpenApiFetchHandlerOptions<TContext> = {},
) => {
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const logErrors = options.logErrors ?? (nodeEnv ? nodeEnv.NODE_ENV !== 'production' : false);

  const handler = new OpenAPIHandler<TContext>(
    router as never,
    logErrors
      ? ({
          interceptors: [
            async (interceptorOptions: { request: { method: string; url: URL }; next: () => unknown }) => {
              try {
                return await interceptorOptions.next();
              } catch (error) {
                console.error(
                  '[openapi]',
                  interceptorOptions.request.method,
                  interceptorOptions.request.url.toString(),
                  error,
                );
                throw error;
              }
            },
          ],
        } as never)
      : undefined,
  );

  const prefix = options.prefix ?? '/api';
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

    const result = await handler.handle(
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

