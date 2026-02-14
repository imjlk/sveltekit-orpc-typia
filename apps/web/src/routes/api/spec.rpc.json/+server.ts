import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const cacheControl = import.meta.env.DEV ? 'no-store' : 'public, max-age=60';

	return new Response(null, {
		status: 302,
		headers: {
			location: '/openapi/openapi.rpc.json',
			'cache-control': cacheControl
		}
	});
};

