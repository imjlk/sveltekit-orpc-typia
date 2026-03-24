import { describe, expect, test } from 'bun:test';
import { createOgFingerprintHash } from '../src/modules/og/fingerprint';
import { buildOgSvg, normalizeOgOptions } from '../src/modules/og/template';

describe('og template helpers', () => {
	test('normalizes defaults and supported options', () => {
		expect(
			normalizeOgOptions({
				title: '  Hello   Starter  ',
				theme: 'ocean',
				align: 'center'
			}),
		).toMatchObject({
			title: 'Hello Starter',
			theme: 'ocean',
			align: 'center'
		});
	});

	test('builds a branded svg payload', () => {
		const svg = buildOgSvg({
			title: 'Starter OG Image',
			subtitle: 'Optional worker-backed PNG rendering for Cloudflare Pages.'
		});

		expect(svg).toContain('<svg');
		expect(svg).toContain('Starter OG Image');
		expect(svg).toContain('CF FIRST STARTER');
	});

	test('creates a stable fingerprint for identical options', () => {
		const first = createOgFingerprintHash({
			title: 'Cloudflare First Starter',
			theme: 'graphite'
		});
		const second = createOgFingerprintHash({
			title: 'Cloudflare First Starter',
			theme: 'graphite'
		});
		const third = createOgFingerprintHash({
			title: 'Different title',
			theme: 'graphite'
		});

		expect(first).toBe(second);
		expect(first).not.toBe(third);
	});
});
