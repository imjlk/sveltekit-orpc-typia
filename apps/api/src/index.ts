import { serve } from 'bun';
import { createAppRouter, createOrpcFetchHandler } from '@repo/api';
import { createDb } from '@repo/db/bun';
import { migrateBunSqlite } from '@repo/db/migrations';

const port = Number(process.env.PORT ?? 3000);

const corsHeaders =
  process.env.NODE_ENV === 'production'
    ? undefined
    : {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

const db = createDb();
migrateBunSqlite(db);
const appRouter = createAppRouter(db);
const fetchHandler = createOrpcFetchHandler(appRouter, {
  prefix: '/rpc',
  corsHeaders,
  healthPath: '/health',
  context: {},
});

serve({
  port,
  fetch: fetchHandler,
});

console.log(`API server running on http://localhost:${port}`);
