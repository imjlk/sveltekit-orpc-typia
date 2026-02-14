import type { RequestHandler } from './$types';
import { renderScalarDocsHtml } from '@repo/shared';

export const GET: RequestHandler = async () => {
	const html = renderScalarDocsHtml({
		specUrl: '/api/spec.rpc.json',
		title: 'sveltekit-orpc-typia RPC (Standard RPC)'
	});

	return new Response(html, {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'x-robots-tag': 'noindex'
		}
	});
};
