import type { OgAlign, OgNormalizedOptions, OgOptions, OgTheme } from './types';

export const OG_TEMPLATE_VERSION = 'starter-og-v1';

const WIDTH = 1200;
const HEIGHT = 630;

const MAX_LENGTH = {
	title: 90,
	subtitle: 180,
	eyebrow: 40,
	badge: 28,
	footer: 48
} as const;

const DEFAULTS: OgNormalizedOptions = {
	title: 'Cloudflare First Starter',
	subtitle: 'SvelteKit, oRPC, typia, Better Auth, D1, and optional Cloudflare Workers.',
	eyebrow: 'Cloudflare-first template',
	badge: 'Optional OG worker',
	footer: 'Pages + Workers + D1',
	theme: 'sunset',
	align: 'left'
};

const THEMES: Record<
	OgTheme,
	{
		gradientStart: string;
		gradientEnd: string;
		panel: string;
		panelAccent: string;
		textStrong: string;
		textMuted: string;
		badgeBg: string;
		badgeText: string;
		line: string;
		glow: string;
	}
> = {
	sunset: {
		gradientStart: '#ff8a00',
		gradientEnd: '#ff3d00',
		panel: '#1f0a04',
		panelAccent: '#401308',
		textStrong: '#fff4eb',
		textMuted: '#ffd3bd',
		badgeBg: '#2d1207',
		badgeText: '#ffe8d7',
		line: '#ffba8a',
		glow: '#ff5f2e'
	},
	ocean: {
		gradientStart: '#0f766e',
		gradientEnd: '#2563eb',
		panel: '#06121d',
		panelAccent: '#0b2537',
		textStrong: '#effaff',
		textMuted: '#bfdbfe',
		badgeBg: '#0d2234',
		badgeText: '#dbeafe',
		line: '#67e8f9',
		glow: '#38bdf8'
	},
	graphite: {
		gradientStart: '#111827',
		gradientEnd: '#334155',
		panel: '#020617',
		panelAccent: '#111827',
		textStrong: '#f8fafc',
		textMuted: '#cbd5e1',
		badgeBg: '#1e293b',
		badgeText: '#e2e8f0',
		line: '#94a3b8',
		glow: '#475569'
	}
};

const sanitizeText = (value: string | undefined, fallback: string, max: number): string => {
	if (typeof value !== 'string') return fallback;
	const collapsed = value.replace(/\s+/g, ' ').trim();
	if (collapsed.length === 0) return fallback;
	return collapsed.slice(0, max);
};

const normalizeTheme = (value: string | undefined): OgTheme => {
	if (value === 'sunset' || value === 'ocean' || value === 'graphite') return value;
	return DEFAULTS.theme;
};

const normalizeAlign = (value: string | undefined): OgAlign => {
	if (value === 'left' || value === 'center') return value;
	return DEFAULTS.align;
};

const escapeXml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

const wrapText = (value: string, maxCharsPerLine: number, maxLines: number): string[] => {
	const words = value.split(/\s+/g).filter(Boolean);
	if (words.length === 0) return [''];

	const lines: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current.length === 0 ? word : `${current} ${word}`;
		if (candidate.length <= maxCharsPerLine) {
			current = candidate;
			continue;
		}

		if (current.length > 0) {
			lines.push(current);
			current = word;
		} else {
			lines.push(word.slice(0, maxCharsPerLine));
			current = word.slice(maxCharsPerLine);
		}

		if (lines.length === maxLines) break;
	}

	if (lines.length < maxLines && current.length > 0) {
		lines.push(current);
	}

	return lines.slice(0, maxLines).map((line, index, array) => {
		if (index === array.length - 1 && words.join(' ').length > array.join(' ').length) {
			return line.endsWith('…') ? line : `${line.slice(0, Math.max(line.length - 1, 1))}…`;
		}
		return line;
	});
};

const renderTextLines = ({
	lines,
	x,
	y,
	fontSize,
	lineHeight,
	fill,
	fontWeight,
	textAnchor
}: {
	lines: string[];
	x: number;
	y: number;
	fontSize: number;
	lineHeight: number;
	fill: string;
	fontWeight: number;
	textAnchor: 'start' | 'middle';
}) =>
	lines
		.map(
			(line, index) =>
				`<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}" text-anchor="${textAnchor}">${escapeXml(line)}</tspan>`,
		)
		.join('');

export const normalizeOgOptions = (input: OgOptions | undefined): OgNormalizedOptions => ({
	title: sanitizeText(input?.title, DEFAULTS.title, MAX_LENGTH.title),
	subtitle: sanitizeText(input?.subtitle, DEFAULTS.subtitle, MAX_LENGTH.subtitle),
	eyebrow: sanitizeText(input?.eyebrow, DEFAULTS.eyebrow, MAX_LENGTH.eyebrow),
	badge: sanitizeText(input?.badge, DEFAULTS.badge, MAX_LENGTH.badge),
	footer: sanitizeText(input?.footer, DEFAULTS.footer, MAX_LENGTH.footer),
	theme: normalizeTheme(input?.theme),
	align: normalizeAlign(input?.align)
});

export const buildOgSvg = (input: OgOptions | undefined): string => {
	const normalized = normalizeOgOptions(input);
	const theme = THEMES[normalized.theme];
	const isCenter = normalized.align === 'center';
	const x = isCenter ? WIDTH / 2 : 108;
	const textAnchor = isCenter ? 'middle' : 'start';
	const titleLines = wrapText(normalized.title, isCenter ? 22 : 26, 3);
	const subtitleLines = wrapText(normalized.subtitle, isCenter ? 34 : 42, 3);
	const footerY = 552;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" role="img" aria-label="${escapeXml(normalized.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.gradientStart}" />
      <stop offset="100%" stop-color="${theme.gradientEnd}" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="25%" r="65%">
      <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" rx="36" fill="url(#bg)" />
  <rect x="52" y="48" width="1096" height="534" rx="28" fill="${theme.panel}" fill-opacity="0.92" />
  <rect x="52" y="48" width="1096" height="534" rx="28" fill="url(#glow)" />
  <circle cx="1040" cy="128" r="164" fill="${theme.panelAccent}" fill-opacity="0.55" />
  <circle cx="950" cy="44" r="96" fill="${theme.line}" fill-opacity="0.1" />
  <path d="M96 468C228 430 336 452 450 486C564 520 666 544 804 496C910 458 1001 412 1104 432" stroke="${theme.line}" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
  <rect x="${isCenter ? 457 : 96}" y="90" width="${isCenter ? 286 : 254}" height="42" rx="21" fill="${theme.badgeBg}" />
  <text x="${isCenter ? 600 : 223}" y="117" fill="${theme.badgeText}" font-size="18" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="600" letter-spacing="0.08em" text-anchor="middle">${escapeXml(normalized.badge.toUpperCase())}</text>
  <text x="${x}" y="180" fill="${theme.textMuted}" font-size="24" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="500" letter-spacing="0.08em" text-anchor="${textAnchor}">${escapeXml(normalized.eyebrow.toUpperCase())}</text>
  <text x="${x}" y="270" fill="${theme.textStrong}" font-size="72" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="700" text-anchor="${textAnchor}">${renderTextLines({
		lines: titleLines,
		x,
		y: 270,
		fontSize: 72,
		lineHeight: 82,
		fill: theme.textStrong,
		fontWeight: 700,
		textAnchor,
	})}</text>
  <text x="${x}" y="452" fill="${theme.textMuted}" font-size="30" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="500" text-anchor="${textAnchor}">${renderTextLines({
		lines: subtitleLines,
		x,
		y: 452,
		fontSize: 30,
		lineHeight: 40,
		fill: theme.textMuted,
		fontWeight: 500,
		textAnchor,
	})}</text>
  <rect x="96" y="520" width="1008" height="2" fill="${theme.line}" opacity="0.35" />
  <text x="${isCenter ? 600 : 96}" y="${footerY}" fill="${theme.textMuted}" font-size="22" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="500" text-anchor="${textAnchor}">${escapeXml(normalized.footer)}</text>
  <text x="1104" y="${footerY}" fill="${theme.textStrong}" font-size="22" font-family="Inter, IBM Plex Sans KR, sans-serif" font-weight="700" text-anchor="end">CF FIRST STARTER</text>
</svg>`;
};
