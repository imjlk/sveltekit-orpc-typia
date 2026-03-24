import { createOgFingerprintHash, normalizeOgOptions, type OgOptions } from '@repo/shared';

const parseTheme = (value: string | null): OgOptions['theme'] => {
	if (value === 'sunset' || value === 'ocean' || value === 'graphite') return value;
	return undefined;
};

const parseAlign = (value: string | null): OgOptions['align'] => {
	if (value === 'left' || value === 'center') return value;
	return undefined;
};

export const parseClientIp = (request: Request): string => {
	const direct = request.headers.get('cf-connecting-ip')?.trim();
	if (direct && direct.length > 0) return direct;

	const forwarded = request.headers.get('x-forwarded-for')?.trim();
	if (forwarded && forwarded.length > 0) {
		const [first] = forwarded.split(',');
		return first?.trim() ?? 'unknown';
	}

	const custom = request.headers.get('x-client-ip')?.trim();
	if (custom && custom.length > 0) return custom;

	return 'unknown';
};

export const parseOgOptionsFromUrl = (url: URL): OgOptions => ({
	title: url.searchParams.get('title') ?? undefined,
	subtitle: url.searchParams.get('subtitle') ?? undefined,
	eyebrow: url.searchParams.get('eyebrow') ?? undefined,
	badge: url.searchParams.get('badge') ?? undefined,
	footer: url.searchParams.get('footer') ?? undefined,
	theme: parseTheme(url.searchParams.get('theme')),
	align: parseAlign(url.searchParams.get('align'))
});

export const buildOgCacheKey = (options: OgOptions): string => createOgFingerprintHash(normalizeOgOptions(options));
