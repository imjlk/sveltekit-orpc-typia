export type OgTheme = 'sunset' | 'ocean' | 'graphite';

export type OgAlign = 'left' | 'center';

export type OgOptions = {
	title?: string;
	subtitle?: string;
	eyebrow?: string;
	badge?: string;
	footer?: string;
	theme?: OgTheme;
	align?: OgAlign;
};

export type OgNormalizedOptions = {
	title: string;
	subtitle: string;
	eyebrow: string;
	badge: string;
	footer: string;
	theme: OgTheme;
	align: OgAlign;
};
