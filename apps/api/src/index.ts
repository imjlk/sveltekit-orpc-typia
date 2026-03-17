import { serve } from 'bun';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApiContext, createAppRouter, createOpenApiFetchHandler, createOrpcFetchHandler } from '@repo/api';
import { createDb, defaultDbPath } from '@repo/db/bun';
import { migrateBunSqliteWithLock } from '@repo/db/migrations';
import { renderScalarDocsHtml } from '@repo/shared';

const port = Number(process.env.PORT ?? 3000);

// apps/api/src -> repo root is 3 levels up
const repoRoot = resolve(import.meta.dir, '../../..');
const apiSpecPath = resolve(repoRoot, 'apps/web/static/openapi/openapi.api.json');
const rpcSpecPath = resolve(repoRoot, 'apps/web/static/openapi/openapi.rpc.json');

let cachedApiSpec: string | null = null;
let cachedRpcSpec: string | null = null;

const getSpecText = async (kind: 'api' | 'rpc'): Promise<string> => {
  if (kind === 'api' && cachedApiSpec) return cachedApiSpec;
  if (kind === 'rpc' && cachedRpcSpec) return cachedRpcSpec;

  const path = kind === 'api' ? apiSpecPath : rpcSpecPath;
  try {
    const text = await readFile(path, 'utf8');
    if (kind === 'api') cachedApiSpec = text;
    else cachedRpcSpec = text;
    return text;
  } catch (err) {
    const message =
      `OpenAPI spec file not found at ${path}. ` +
      `Run "bun run gen:openapi" to generate and commit the checked-in spec.`;
    throw Object.assign(new Error(message), { cause: err });
  }
};

const corsHeaders =
  process.env.NODE_ENV === 'production'
    ? undefined
    : {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

const localDbPath = process.env.DATABASE_URL ?? defaultDbPath;
const db = createDb(localDbPath);
await migrateBunSqliteWithLock(db, localDbPath);
const appRouter = createAppRouter(db);
const rpcHandler = createOrpcFetchHandler(appRouter, {
  prefix: '/rpc',
  corsHeaders,
  healthPath: '/health',
  createContext: (request) => createApiContext(request, { env: process.env, allowDevFallback: true }),
});

const openApiHandler = createOpenApiFetchHandler(appRouter, {
  prefix: '/api',
  corsHeaders,
  healthPath: '/health',
  createContext: (request) => createApiContext(request, { env: process.env, allowDevFallback: true }),
});

serve({
  port,
  fetch: async (request: Request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Scalar UI + spec endpoints (served by Bun server too, for local dev parity).
    if (pathname === '/api/docs' || pathname === '/api/docs/') {
      return new Response(renderScalarDocsHtml({ specUrl: '/api/spec.json', title: 'Cloudflare First Starter API' }), {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'noindex',
        },
      });
    }

    if (pathname === '/api/docs/rpc' || pathname === '/api/docs/rpc/') {
      return new Response(
        renderScalarDocsHtml({
          specUrl: '/api/spec.rpc.json',
          title: 'Cloudflare First Starter RPC',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'x-robots-tag': 'noindex',
          },
        },
      );
    }

    if (pathname === '/api/spec.json') {
      try {
        const text = await getSpecText('api');
        return new Response(text, {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        });
      } catch (err) {
        console.error(err);
        return new Response((err as Error).message, { status: 500 });
      }
    }

    if (pathname === '/api/spec.rpc.json') {
      try {
        const text = await getSpecText('rpc');
        return new Response(text, {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        });
      } catch (err) {
        console.error(err);
        return new Response((err as Error).message, { status: 500 });
      }
    }

    if (pathname.startsWith('/api')) return openApiHandler(request);
    return rpcHandler(request);
  },
});

console.log(`Cloudflare First Starter API server running on http://localhost:${port}`);
