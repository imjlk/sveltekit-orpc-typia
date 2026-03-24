const OG_FONT_URLS = [
	'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-500-normal.woff2',
	'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-700-normal.woff2',
	'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-500-normal.woff2',
	'https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans-kr/files/ibm-plex-sans-kr-korean-700-normal.woff2'
] as const;

let fontBuffersPromise: Promise<Uint8Array[]> | null = null;

const fetchFontBuffer = async (url: string): Promise<Uint8Array> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch font: ${url} (${response.status})`);
	}

	return new Uint8Array(await response.arrayBuffer());
};

export const getOgFontBuffers = async (): Promise<Uint8Array[]> => {
	if (!fontBuffersPromise) {
		fontBuffersPromise = Promise.all(OG_FONT_URLS.map((url) => fetchFontBuffer(url))).catch((error) => {
			console.warn('Failed to load OG fonts, falling back to runtime defaults:', error);
			return [];
		});
	}

	return fontBuffersPromise;
};
