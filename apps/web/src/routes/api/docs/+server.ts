import type { RequestHandler } from './$types';
import { renderScalarDocsHtml } from '@repo/shared';

export const GET: RequestHandler = async () => {
	const html = renderScalarDocsHtml({ specUrl: '/api/spec.json', title: 'Cloudflare First Starter API' });

	return new Response(html, {
		status: 200,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'x-robots-tag': 'noindex'
		}
	});
};
