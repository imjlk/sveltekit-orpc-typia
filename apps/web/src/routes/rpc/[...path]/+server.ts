import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const DEFAULT_RPC_URL = 'http://127.0.0.1:3000/rpc';

type ServiceBinding = {
	fetch: (request: Request) => Promise<Response>;
};

const normalizeRpcUrl = (value: string) => {
	const trimmed = value.trim().replace(/\/+$/, '');
	return trimmed.endsWith('/rpc') ? trimmed : `${trimmed}/rpc`;
};

const isServiceBinding = (value: unknown): value is ServiceBinding =>
	!!value && typeof value === 'object' && 'fetch' in value && typeof (value as { fetch?: unknown }).fetch === 'function';

const resolvePlatformEnv = (platform: RequestEvent['platform']): Record<string, unknown> | undefined =>
	(platform as { env?: Record<string, unknown> } | undefined)?.env;

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
	const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	return env?.ORPC_API_URL ?? env?.VITE_API_URL;
};

const resolveUpstream = (
	platform: RequestEvent['platform'],
	routerName: string | undefined
): { kind: 'binding'; binding: ServiceBinding } | { kind: 'url'; url: string } => {
	const env = resolvePlatformEnv(platform);
	const upper = routerName?.toUpperCase();

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

	// Default URL (Cloudflare env var or Node env var)
	const url =
		(typeof env?.ORPC_API_URL === 'string' ? env.ORPC_API_URL : undefined) ??
		(typeof env?.ORPC_DEFAULT_URL === 'string' ? env.ORPC_DEFAULT_URL : undefined) ??
		resolveNodeRpcUrl() ??
		DEFAULT_RPC_URL;

	return { kind: 'url', url: normalizeRpcUrl(url) };
};

const forwardRpc: RequestHandler = async ({ fetch, params, platform, request, url }) => {
	const path = params.path ? `/${params.path}` : '';
	const routerName = params.path?.split('/')[0];
	const upstream = resolveUpstream(platform, routerName);

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
