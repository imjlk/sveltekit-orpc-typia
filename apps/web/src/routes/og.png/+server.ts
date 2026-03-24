import type { RequestHandler } from './$types';
import { fetchOgWorker } from '$lib/server/og-worker';

const getClientIp = (request: Request): string => {
	const direct = request.headers.get('cf-connecting-ip')?.trim();
	if (direct && direct.length > 0) return direct;

	const forwarded = request.headers.get('x-forwarded-for')?.trim();
	if (forwarded && forwarded.length > 0) {
		const [first] = forwarded.split(',');
		return first?.trim() ?? 'unknown';
	}

	return 'unknown';
};

const copyHeaders = (response: Response): Headers => {
	const headers = new Headers();
	for (const name of ['content-type', 'cache-control', 'etag', 'x-og-source', 'x-og-cache', 'x-og-cache-key']) {
		const value = response.headers.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
};

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.toString();
	const upstream = await fetchOgWorker({
		event,
		path: `/render.png${query.length > 0 ? `?${query}` : ''}`,
		init: {
			method: 'GET',
			headers: {
				'x-client-ip': getClientIp(event.request)
			}
		}
	});

	if (!upstream) {
		return new Response('OG worker is not configured. Attach OG_WORKER or set OG_WORKER_BASE_URL.', {
			status: 503,
			headers: {
				'cache-control': 'no-store'
			}
		});
	}

	if (!upstream.ok || !upstream.body) {
		return new Response(await upstream.text(), {
			status: upstream.status,
			headers: {
				'cache-control': upstream.headers.get('cache-control') ?? 'no-store'
			}
		});
	}

	return new Response(upstream.body, {
		status: upstream.status,
		headers: copyHeaders(upstream)
	});
};
