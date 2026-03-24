import { describe, expect, test } from 'bun:test';
import { buildOgCacheKey, parseClientIp, parseOgOptionsFromUrl } from './options';

describe('worker-og options helpers', () => {
	test('parses query params into OG options', () => {
		const url = new URL(
			'https://starter.test/render.png?title=Cloudflare%20First%20Starter&theme=ocean&align=center',
		);

		expect(parseOgOptionsFromUrl(url)).toEqual({
			title: 'Cloudflare First Starter',
			subtitle: undefined,
			eyebrow: undefined,
			badge: undefined,
			footer: undefined,
			theme: 'ocean',
			align: 'center'
		});
	});

	test('creates stable cache keys', () => {
		const first = buildOgCacheKey({ title: 'A', subtitle: 'B' });
		const second = buildOgCacheKey({ title: 'A', subtitle: 'B' });
		const third = buildOgCacheKey({ title: 'A', subtitle: 'C' });

		expect(first).toBe(second);
		expect(first).not.toBe(third);
	});

	test('prefers direct client ip headers', () => {
		const request = new Request('https://starter.test/og.png', {
			headers: {
				'cf-connecting-ip': '203.0.113.10',
				'x-forwarded-for': '198.51.100.4'
			}
		});

		expect(parseClientIp(request)).toBe('203.0.113.10');
	});
});
