import { normalizeOgOptions, OG_TEMPLATE_VERSION } from './template';
import type { OgOptions } from './types';

const fnv1a = (value: string): string => {
	let hash = 0x811c9dc5;
	const bytes = new TextEncoder().encode(value);

	for (const byte of bytes) {
		hash ^= byte;
		hash = Math.imul(hash, 0x01000193);
	}

	return (hash >>> 0).toString(16).padStart(8, '0');
};

export const createOgFingerprintHash = (options: OgOptions | undefined): string => {
	const normalized = normalizeOgOptions(options);
	return `${OG_TEMPLATE_VERSION}-${fnv1a(JSON.stringify(normalized))}`;
};
