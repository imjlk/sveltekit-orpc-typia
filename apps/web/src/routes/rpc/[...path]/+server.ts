import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const DEFAULT_RPC_URL = 'http://127.0.0.1:3000/rpc';

type ServiceBinding = {
	fetch: (request: Request) => Promise<Response>;
};

type Upstream =
	| { kind: 'binding'; binding: ServiceBinding }
	| { kind: 'url'; url: string }
	| { kind: 'local' };

const normalizeRpcUrl = (value: string) => {
	const trimmed = value.trim().replace(/\/+$/, '');
	return trimmed.endsWith('/rpc') ? trimmed : `${trimmed}/rpc`;
};

const isServiceBinding = (value: unknown): value is ServiceBinding =>
	!!value && typeof value === 'object' && 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';

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

const resolveNodeRpcUrl = (): string | undefined => {
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
	// - Direct: env.ORPC_POST (Service Binding)
	// - Indirect: env.ORPC_POST_BINDING="MY_WORKER" + env.MY_WORKER (Service Binding)
	if (upper) {
		const binding = resolvePlatformBinding(env, `ORPC_${upper}`);
		if (binding) return { kind: 'binding', binding };

		const url = env?.[`ORPC_${upper}_URL`];
		if (typeof url === 'string') return { kind: 'url', url: normalizeRpcUrl(url) };
	}

	// Default binding:
	// - env.ORPC_DEFAULT (Service Binding) or env.ORPC_DEFAULT_BINDING="..."
	// - env.ORPC_API (Service Binding) or env.ORPC_API_BINDING="..."
	const defaultBinding =
		resolvePlatformBinding(env, 'ORPC_DEFAULT') ?? resolvePlatformBinding(env, 'ORPC_API');
	if (defaultBinding) return { kind: 'binding', binding: defaultBinding };

	// In-process mode (Cloudflare Pages / Workers / local dev): handle within this runtime.
	// Note: still allows explicit per-router/default upstream overrides above.
	if (inProcessEnabled) {
		return { kind: 'local' };
	}

	// Default URL (Cloudflare env var or Node env var), if configured.
	const configuredUrl =
		(typeof env?.ORPC_API_URL === 'string' ? env.ORPC_API_URL : undefined) ??
		(typeof env?.ORPC_DEFAULT_URL === 'string' ? env.ORPC_DEFAULT_URL : undefined) ??
		resolveNodeRpcUrl();

	if (configuredUrl) {
		return { kind: 'url', url: normalizeRpcUrl(configuredUrl) };
	}

	// Fallback: local dev server.
	return { kind: 'url', url: normalizeRpcUrl(DEFAULT_RPC_URL) };
};

let localHandlerPromise: Promise<(request: Request) => Promise<Response>> | null = null;

const getLocalHandler = async (platform: RequestEvent['platform']) => {
	if (localHandlerPromise) return localHandlerPromise;

	localHandlerPromise = (async () => {
		const env = resolvePlatformEnv(platform);

		// Cloudflare runtime: use D1 binding.
		if (env) {
			const dbBindingName = typeof env.ORPC_DB_BINDING === 'string' ? env.ORPC_DB_BINDING : 'DB';
			const dbBinding = env[dbBindingName];
			if (dbBinding) {
				const [{ createD1Db }, { createAppRouter, createOrpcFetchHandler }] = await Promise.all([
					import('@repo/db/d1'),
					import('@repo/api')
				]);

				const db = createD1Db(dbBinding);
				const router = createAppRouter(db);

				return createOrpcFetchHandler(router, {
					prefix: '/rpc',
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

		const [{ createDb }, { createAppRouter, createOrpcFetchHandler }] = await Promise.all([
			import('@repo/db/bun'),
			import('@repo/api')
		]);

		const db = createDb();
		const router = createAppRouter(db);

		return createOrpcFetchHandler(router, {
			prefix: '/rpc',
			context: {}
		});
	})();

	return localHandlerPromise;
};

const forwardRpc: RequestHandler = async ({ fetch, params, platform, request, url }) => {
	const path = params.path ? `/${params.path}` : '';
	const routerName = params.path?.split('/')[0];
	const upstream = resolveUpstream(platform, routerName);

	if (upstream.kind === 'local') {
		try {
			const handler = await getLocalHandler(platform);
			return handler(request);
		} catch (error) {
			console.error('Failed to handle RPC request in-process:', error);
			return new Response('Bad Gateway', { status: 502 });
		}
	}

	const baseRpcUrl = upstream.kind === 'url' ? upstream.url : 'https://orpc.local/rpc';
	const targetUrl = new URL(`${baseRpcUrl}${path}`);
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
		console.error('Failed to forward RPC request:', error);
		return new Response('Bad Gateway', { status: 502 });
	}
};

export const GET: RequestHandler = forwardRpc;
export const POST: RequestHandler = forwardRpc;
export const PUT: RequestHandler = forwardRpc;
export const PATCH: RequestHandler = forwardRpc;
export const DELETE: RequestHandler = forwardRpc;
export const OPTIONS: RequestHandler = forwardRpc;
export const HEAD: RequestHandler = forwardRpc;
