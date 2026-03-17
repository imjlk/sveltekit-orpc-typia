import type { RequestHandler } from '@sveltejs/kit';
import { createGatewayHandler } from '@repo/gateway';
import { getGatewayInternalHeaders } from '$lib/server/gateway-auth';

const handler: RequestHandler = createGatewayHandler('rpc', {
	isDev: import.meta.env.DEV,
	getInternalHeaders: (event) => getGatewayInternalHeaders(event as Parameters<typeof getGatewayInternalHeaders>[0])
});

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
export const OPTIONS: RequestHandler = handler;
export const HEAD: RequestHandler = handler;
