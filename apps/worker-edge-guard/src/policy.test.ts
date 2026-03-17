import { describe, expect, test } from 'bun:test';
import {
	getRetryAfterSeconds,
	getWindowStart,
	normalizeGuardMode,
	toRateLimitBindingResult
} from './policy';

describe('edge guard policy helpers', () => {
	test('normalizes mode to ratelimit by default', () => {
		expect(normalizeGuardMode(undefined)).toBe('ratelimit');
		expect(normalizeGuardMode('do')).toBe('do');
	});

	test('builds best-effort binding results', () => {
		expect(toRateLimitBindingResult(true, 5, 60)).toEqual({
			allowed: true,
			limit: 5,
			remaining: 4,
			retryAfterSeconds: undefined
		});
		expect(toRateLimitBindingResult(false, 5, 60)).toEqual({
			allowed: false,
			limit: 5,
			remaining: 0,
			retryAfterSeconds: 60
		});
	});

	test('computes retry windows for DO mode', () => {
		const nowMs = Date.UTC(2026, 2, 10, 0, 0, 5);
		const windowStart = getWindowStart(nowMs, 60);
		expect(windowStart).toBe(Date.UTC(2026, 2, 10, 0, 0, 0));
		expect(getRetryAfterSeconds(nowMs, windowStart, 60)).toBe(55);
	});
});
