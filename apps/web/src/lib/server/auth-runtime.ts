import type { RequestEvent } from '@sveltejs/kit';

type EventLike = Pick<RequestEvent, 'platform' | 'url'>;

export const isLocalHost = (url: URL): boolean => url.hostname === '127.0.0.1' || url.hostname === 'localhost';

const isDevAuthRuntime = (): boolean => Boolean(import.meta.env?.DEV) || process.env.NODE_ENV === 'test';

export const isCloudflareRuntime = (event: EventLike): boolean =>
	!!event.platform?.env && !shouldAllowLocalAuthFallback(event);

export const shouldAllowLocalAuthFallback = (event: EventLike): boolean =>
	isLocalHost(event.url) && isDevAuthRuntime();
