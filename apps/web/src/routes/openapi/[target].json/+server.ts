import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const target = params.target;
	if (target !== 'api' && target !== 'rpc') {
		return new Response('Not Found', { status: 404 });
	}

	// Always serve the checked-in static spec (runtime cost 0).
	// `?live=1` is reserved for a future "live generation" dev endpoint.
	if (url.searchParams.get('live') === '1') {
		return new Response('Live generation is not enabled. Use the static spec instead.', { status: 501 });
	}

	return new Response(null, {
		status: 302,
		headers: {
			location: `/openapi/openapi.${target}.json`
		}
	});
};
