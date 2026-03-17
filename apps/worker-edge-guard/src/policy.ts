import type { CheckPostCreateLimitResult, EdgeGuardMode } from '@repo/shared';

export const POST_CREATE_LIMIT = 5;
export const POST_CREATE_PERIOD_SECONDS = 60;

export const normalizeGuardMode = (value: unknown): EdgeGuardMode => (value === 'do' ? 'do' : 'ratelimit');

export const toRateLimitBindingResult = (
	success: boolean,
	limit = POST_CREATE_LIMIT,
	periodSeconds = POST_CREATE_PERIOD_SECONDS
): CheckPostCreateLimitResult => ({
	allowed: success,
	limit,
	// Workers Rate Limiting exposes only success/deny, so this is an explicit best-effort hint.
	remaining: success ? Math.max(limit - 1, 0) : 0,
	retryAfterSeconds: success ? undefined : periodSeconds
});

export const getWindowStart = (nowMs: number, periodSeconds = POST_CREATE_PERIOD_SECONDS): number => {
	const periodMs = periodSeconds * 1000;
	return Math.floor(nowMs / periodMs) * periodMs;
};

export const getRetryAfterSeconds = (
	nowMs: number,
	windowStartMs: number,
	periodSeconds = POST_CREATE_PERIOD_SECONDS
): number => {
	const remainingMs = windowStartMs + periodSeconds * 1000 - nowMs;
	return Math.max(1, Math.ceil(remainingMs / 1000));
};
