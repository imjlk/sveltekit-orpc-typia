import type { RequestHandler } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';

const handler: RequestHandler = async (event) => {
	const { auth } = await createAuth(event);
	return auth.handler(event.request);
};

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
