import { Resvg } from '@cf-wasm/resvg/workerd';
import { buildOgSvg, type OgOptions } from '@repo/shared';
import { getOgFontBuffers } from './fonts';

export const renderOgPng = async (options: OgOptions): Promise<Uint8Array> => {
	const svg = buildOgSvg(options);
	const fontBuffers = await getOgFontBuffers();
	const renderer = await Resvg.async(svg, {
		font:
			fontBuffers.length > 0
				? {
						fontBuffers,
						defaultFontFamily: 'IBM Plex Sans KR',
						sansSerifFamily: 'IBM Plex Sans KR',
						serifFamily: 'IBM Plex Sans KR',
						monospaceFamily: 'IBM Plex Sans KR'
					}
				: {
						loadSystemFonts: true,
						defaultFontFamily: 'sans-serif',
						sansSerifFamily: 'sans-serif'
					},
		languages: ['ko', 'en']
	});

	const rendered = renderer.render();
	const png = rendered.asPng();
	rendered.free();
	renderer.free();
	return png;
};
