import { describe, expect, test } from 'bun:test';
import { fetchOgWorker } from './og-worker';

describe('fetchOgWorker', () => {
	test('returns null when no direct base url or service binding exists', async () => {
		const response = await fetchOgWorker({
			event: {},
			path: '/render.png?title=Starter'
		});

		expect(response).toBeNull();
	});

	test('prefers direct base url when configured', async () => {
		const originalFetch = globalThis.fetch;
		const calls: string[] = [];

		globalThis.fetch = (async (input) => {
			calls.push(typeof input === 'string' ? input : input instanceof Request ? input.url : String(input));
			return new Response('ok', { status: 200 });
		}) as typeof fetch;

		try {
			const response = await fetchOgWorker({
				event: {
					platform: {
						env: {
							OG_WORKER_BASE_URL: 'http://127.0.0.1:8891'
						}
					} as App.Platform
				},
				path: '/render.png?title=Starter'
			});

			expect(response?.status).toBe(200);
			expect(calls).toEqual(['http://127.0.0.1:8891/render.png?title=Starter']);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
