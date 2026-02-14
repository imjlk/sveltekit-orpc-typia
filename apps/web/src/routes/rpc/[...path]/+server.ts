import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

const DEFAULT_RPC_URL = 'http://127.0.0.1:3000/rpc';

const normalizeRpcUrl = (value: string) => {
	const trimmed = value.trim().replace(/\/+$/, '');
	return trimmed.endsWith('/rpc') ? trimmed : `${trimmed}/rpc`;
};

const resolvePlatformRpcUrl = (platform: RequestEvent['platform']): string | undefined => {
	const env = (platform as { env?: Record<string, unknown> } | undefined)?.env;
	const rpcUrl = env?.ORPC_API_URL;
	return typeof rpcUrl === 'string' ? rpcUrl : undefined;
};

const resolveNodeRpcUrl = (): string | undefined => {
	const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
	return env?.ORPC_API_URL ?? env?.VITE_API_URL;
};

const resolveRpcUrl = (platform: RequestEvent['platform']) => {
	const value = resolvePlatformRpcUrl(platform) ?? resolveNodeRpcUrl() ?? DEFAULT_RPC_URL;

	return normalizeRpcUrl(value);
};

const forwardRpc: RequestHandler = async ({ fetch, params, platform, request, url }) => {
	const path = params.path ? `/${params.path}` : '';
	const targetUrl = new URL(`${resolveRpcUrl(platform)}${path}`);
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
		const response = await fetch(targetUrl, init);
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
