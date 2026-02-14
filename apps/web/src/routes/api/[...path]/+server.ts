import type { RequestHandler } from '@sveltejs/kit';
import { createGatewayHandler } from '$lib/server/orpc-gateway';

const handler: RequestHandler = createGatewayHandler('api');

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
export const OPTIONS: RequestHandler = handler;
export const HEAD: RequestHandler = handler;
