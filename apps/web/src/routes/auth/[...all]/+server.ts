import type { RequestHandler } from '@sveltejs/kit';
import { handleAuthRequest } from '$lib/server/auth';

const handler: RequestHandler = (event) => handleAuthRequest(event);

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
