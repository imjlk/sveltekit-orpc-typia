import { serve } from 'bun';
import { createAppRouter, createOrpcFetchHandler } from '@repo/api';
import { createDb } from '@repo/db/bun';

const port = Number(process.env.PORT ?? 3000);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const db = createDb();
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
