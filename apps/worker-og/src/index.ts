import { buildOgCacheKey, parseClientIp, parseOgOptionsFromUrl } from './options';
import { renderOgPng } from './renderer';

type Env = Cloudflare.Env;

const CACHE_NAME = 'og-images';

const toCacheRequest = (cacheKey: string) => new Request(`https://og-cache.local/${cacheKey}`);

const buildResponse = ({
	cacheKey,
	png,
	cacheStatus
}: {
	cacheKey: string;
	png: Uint8Array;
	cacheStatus: 'hit' | 'miss';
}) => {
	const body = new Uint8Array(png.byteLength);
	body.set(png);

	return new Response(body, {
		status: 200,
		headers: {
			'content-type': 'image/png',
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
			etag: `"${cacheKey}"`,
			'x-og-source': 'generated',
			'x-og-cache': cacheStatus,
			'x-og-cache-key': cacheKey
		}
	});
};

const applyRateLimit = async (request: Request, env: Env): Promise<boolean> => {
	if (!env.OG_RATE_LIMIT) return true;

	try {
		const outcome = await env.OG_RATE_LIMIT.limit({ key: parseClientIp(request) });
		return outcome.success;
	} catch (error) {
		console.warn('OG rate limit binding failed, allowing request:', error);
		return true;
	}
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/health') {
			return new Response('ok', { status: 200 });
		}

		if (request.method !== 'GET' || url.pathname !== '/render.png') {
			return new Response('Not Found', { status: 404 });
		}

		const allowed = await applyRateLimit(request, env);
		if (!allowed) {
			return new Response('Too Many Requests', {
				status: 429,
				headers: { 'cache-control': 'no-store' }
			});
		}

		const options = parseOgOptionsFromUrl(url);
		const cacheKey = buildOgCacheKey(options);
		const cacheRequest = toCacheRequest(cacheKey);
		const cache = await caches.open(CACHE_NAME);
		const cached = await cache.match(cacheRequest);

		if (cached) {
			const headers = new Headers(cached.headers);
			headers.set('x-og-cache', 'hit');
			return new Response(cached.body, {
				status: cached.status,
				headers
			});
		}

		try {
			const png = await renderOgPng(options);
			const response = buildResponse({
				cacheKey,
				png,
				cacheStatus: 'miss'
			});
			await cache.put(cacheRequest, response.clone());
			return response;
		} catch (error) {
			console.error('OG render failed:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	}
} satisfies ExportedHandler<Env>;
