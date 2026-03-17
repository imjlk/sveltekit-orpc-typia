const DEFAULT_NEXT_PATH = '/posts';

export const normalizeNextPath = (value: string | null | undefined, fallback = DEFAULT_NEXT_PATH): string => {
	if (!value) return fallback;
	if (!value.startsWith('/')) return fallback;
	if (value.startsWith('//')) return fallback;
	if (value.startsWith('/auth')) return fallback;
	return value;
};

export const buildAuthNextQuery = (value: string): string => `?next=${encodeURIComponent(normalizeNextPath(value))}`;
