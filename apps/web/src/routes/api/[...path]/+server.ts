import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const DEFAULT_API_URL = 'http://127.0.0.1:3000/api';

type ServiceBinding = {
	fetch: (request: Request) => Promise<Response>;
};

type D1DatabaseLike = {
	prepare: (query: string) => unknown;
};

type Upstream =
	| { kind: 'binding'; binding: ServiceBinding }
	| { kind: 'url'; url: string }
	| { kind: 'local' };

const normalizeApiUrl = (value: string) => {
	const trimmed = value.trim().replace(/\/+$/, '');
	if (trimmed.endsWith('/api')) return trimmed;
	// Allow reusing /rpc URLs by mapping to /api.
	if (trimmed.endsWith('/rpc')) return `${trimmed.slice(0, -4)}/api`;
	return `${trimmed}/api`;
};

const isServiceBinding = (value: unknown): value is ServiceBinding =>
	!!value && typeof value === 'object' && 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';

const isD1Database = (value: unknown): value is D1DatabaseLike =>
	!!value &&
	typeof value === 'object' &&
	'prepare' in value &&
	typeof (value as { prepare?: unknown }).prepare === 'function';

const resolvePlatformEnv = (platform: RequestEvent['platform']): Record<string, unknown> | undefined =>
	(platform as { env?: Record<string, unknown> } | undefined)?.env;

const isTruthy = (value: unknown): boolean =>
	value === '1' || value === 'true' || value === 'TRUE' || value === 'yes' || value === 'YES';

const resolveNodeEnv = (): Record<string, string | undefined> | undefined =>
	(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;

const resolvePlatformBinding = (
	env: Record<string, unknown> | undefined,
	key: string
): ServiceBinding | undefined => {
	const direct = env?.[key];
	if (isServiceBinding(direct)) return direct;

	const bindingName = env?.[`${key}_BINDING`];
	if (typeof bindingName !== 'string') return undefined;

	const indirect = env?.[bindingName];
	return isServiceBinding(indirect) ? indirect : undefined;
};

const resolveNodeBaseUrl = (): string | undefined => {
	const env = resolveNodeEnv();
	return env?.ORPC_API_URL ?? env?.VITE_API_URL;
};

const resolveUpstream = (
	platform: RequestEvent['platform'],
	routerName: string | undefined
): Upstream => {
	const env = resolvePlatformEnv(platform);
	const nodeEnv = resolveNodeEnv();
	const upper = routerName?.toUpperCase();
	const inProcessEnabled = isTruthy(env?.ORPC_IN_PROCESS) || isTruthy(nodeEnv?.ORPC_IN_PROCESS);

	// Per-router binding via service bindings:
	if (upper) {
		const binding = resolvePlatformBinding(env, `ORPC_${upper}`);
		if (binding) return { kind: 'binding', binding };

		const url = env?.[`ORPC_${upper}_URL`];
		if (typeof url === 'string') return { kind: 'url', url: normalizeApiUrl(url) };
	}

	// Default binding:
	const defaultBinding =
		resolvePlatformBinding(env, 'ORPC_DEFAULT') ?? resolvePlatformBinding(env, 'ORPC_API');
	if (defaultBinding) return { kind: 'binding', binding: defaultBinding };

	// Default URL (Cloudflare env var or Node env var), if configured.
	const configuredUrl =
		(typeof env?.ORPC_API_URL === 'string' ? env.ORPC_API_URL : undefined) ??
		(typeof env?.ORPC_DEFAULT_URL === 'string' ? env.ORPC_DEFAULT_URL : undefined) ??
		resolveNodeBaseUrl();

	if (configuredUrl) {
		return { kind: 'url', url: normalizeApiUrl(configuredUrl) };
	}

	if (inProcessEnabled) {
		return { kind: 'local' };
	}

	return { kind: 'url', url: normalizeApiUrl(DEFAULT_API_URL) };
};

let localHandlerPromise: Promise<(request: Request) => Promise<Response>> | null = null;

const getLocalHandler = async (platform: RequestEvent['platform']) => {
	if (localHandlerPromise) return localHandlerPromise;

	localHandlerPromise = (async () => {
		const env = resolvePlatformEnv(platform);

		// Cloudflare runtime (built output): use D1 binding.
		// In local Vite dev, adapter-cloudflare can provide a miniflare D1 binding without schema;
		// prefer Bun sqlite there and validate D1 separately via `wrangler pages dev`.
		if (!import.meta.env.DEV && env) {
			const dbBindingName = typeof env.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
			const dbBinding = env[dbBindingName];
			if (isD1Database(dbBinding)) {
				const [{ createD1Db }, { createAppRouter, createOpenApiFetchHandler }] = await Promise.all([
					import('@repo/db/d1'),
					import('@repo/api')
				]);

				const db = createD1Db(dbBinding);
				const router = createAppRouter(db);

				return createOpenApiFetchHandler(router, {
					prefix: '/api',
					context: {}
				});
			}
		}

		// Local dev (Bun runtime): use sqlite via bun:sqlite.
		if (!import.meta.env.DEV) {
			const dbBindingName = typeof env?.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
			throw new Error(
				`Missing D1 binding "${dbBindingName}" (set ORPC_DB_BINDING or bind as DB), or disable ORPC_IN_PROCESS.`,
			);
		}

		const [{ createDb }, { migrateBunSqlite }, { createAppRouter, createOpenApiFetchHandler }] =
			await Promise.all([import('@repo/db/bun'), import('@repo/db/migrations'), import('@repo/api')]);

		const nodeEnv = resolveNodeEnv();
		const dbUrl =
			typeof nodeEnv?.DATABASE_URL === 'string' && nodeEnv.DATABASE_URL.trim().length > 0
				? nodeEnv.DATABASE_URL
				: undefined;

		const db = createDb(dbUrl);
		migrateBunSqlite(db);
		const router = createAppRouter(db);

		return createOpenApiFetchHandler(router, {
			prefix: '/api',
			context: {}
		});
	})();

	return localHandlerPromise;
};

const forwardApi: RequestHandler = async ({ fetch, params, platform, request, url }) => {
	const path = params.path ? `/${params.path}` : '';
	const routerName = params.path?.split('/')[0];
	const upstream = resolveUpstream(platform, routerName);

	if (upstream.kind === 'local') {
		try {
			const handler = await getLocalHandler(platform);
			return handler(request);
		} catch (error) {
			console.error('Failed to handle OpenAPI request in-process:', error);
			return new Response('Bad Gateway', { status: 502 });
		}
	}

	const baseApiUrl = upstream.kind === 'url' ? upstream.url : 'https://orpc.local/api';
	const targetUrl = new URL(`${baseApiUrl}${path}`);
	targetUrl.search = url.search;

	const headers = new Headers(request.headers);
	headers.delete('host');

	const init: RequestInit = {
		method: request.method,
		headers
	};

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		const requestBody = await request.arrayBuffer();
		init.body = requestBody.byteLength > 0 ? requestBody : undefined;
	}

	try {
		const response =
			upstream.kind === 'binding'
				? await upstream.binding.fetch(new Request(targetUrl, init))
				: await fetch(targetUrl, init);

		return new Response(response.body, {
			status: response.status,
			headers: response.headers
		});
	} catch (error) {
		console.error('Failed to forward OpenAPI request:', error);
		return new Response('Bad Gateway', { status: 502 });
	}
};

export const GET: RequestHandler = forwardApi;
export const POST: RequestHandler = forwardApi;
export const PUT: RequestHandler = forwardApi;
export const PATCH: RequestHandler = forwardApi;
export const DELETE: RequestHandler = forwardApi;
export const OPTIONS: RequestHandler = forwardApi;
export const HEAD: RequestHandler = forwardApi;

