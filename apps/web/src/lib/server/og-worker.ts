type RequestEventLike = {
	platform?: App.Platform;
};

const normalizeBaseUrl = (value: string): string => (value.endsWith('/') ? value : `${value}/`);

export const fetchOgWorker = async ({
	event,
	path,
	init
}: {
	event: RequestEventLike;
	path: string;
	init?: RequestInit;
}): Promise<Response | null> => {
	const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
	const directBaseUrl =
		event.platform?.env?.OG_WORKER_BASE_URL ?? (typeof process !== 'undefined' ? process.env.OG_WORKER_BASE_URL : undefined);
	let directError: unknown = null;

	if (typeof directBaseUrl === 'string' && directBaseUrl.trim().length > 0) {
		try {
			const url = new URL(normalizedPath, normalizeBaseUrl(directBaseUrl.trim()));
			return await fetch(url, init);
		} catch (error) {
			directError = error;
			console.warn('Direct OG worker fetch failed:', error);
		}
	}

	const ogWorker = event.platform?.env?.OG_WORKER;
	if (!ogWorker) {
		if (directError) throw directError;
		return null;
	}

	return ogWorker.fetch(new Request(new URL(normalizedPath, 'https://og-worker').toString(), init));
};
