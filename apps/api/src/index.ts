import { serve } from 'bun';
import { RPCHandler } from '@orpc/server/fetch';
import { postRouter } from './router';

const rpcHandler = new RPCHandler(postRouter);
const port = Number(process.env.PORT ?? 3000);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve({
  port,
  async fetch(req) {
    const requestUrl = new URL(req.url);

    if (requestUrl.pathname === '/health') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const result = await rpcHandler.handle(req, {
      prefix: '/rpc',
      context: {},
    });

    if (!result.matched) {
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    const responseHeaders = new Headers(result.response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  },
});

console.log(`API server running on http://localhost:${port}`);
