import type { Handle } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (path.startsWith('/rpc/') || path.startsWith('/api/')) {
		return resolve(event);
	}

	const { auth } = await createAuth(event);
	event.locals.auth = auth;

	return resolve(event);
};
