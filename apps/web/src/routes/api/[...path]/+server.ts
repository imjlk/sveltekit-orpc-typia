import type { RequestHandler } from '@sveltejs/kit';
import { createGatewayHandler } from '@repo/gateway';

const handler: RequestHandler = createGatewayHandler('api', {
	isDev: import.meta.env.DEV
});

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
export const OPTIONS: RequestHandler = handler;
export const HEAD: RequestHandler = handler;
