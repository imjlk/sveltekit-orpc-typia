import type { RequestEvent } from '@sveltejs/kit';
import {
	createAuthPasswordHasher as createBetterAuthPasswordHasher,
	resolveAuthPasswordHasherBinding,
} from '@repo/auth-hasher-better-auth-adapter';
import {
	isLocalAuthHasherProxyError,
	type AuthHasherBinding
} from '@repo/auth-hasher-client';
import { hashPassword as fallbackHashPassword, verifyPassword as fallbackVerifyPassword } from 'better-auth/crypto';
import { isLocalHost, shouldAllowLocalAuthFallback } from './auth-runtime';

type EventLike = Pick<RequestEvent, 'platform' | 'url'>;

type AuthPasswordHasher = {
	hash(password: string): Promise<string>;
	verify(data: { hash: string; password: string }): Promise<boolean>;
};

type ResolveAuthHasherOptions = {
	allowDevFallback?: boolean;
};

const shouldAllowLocalProxyFallback = (
	event: EventLike,
	options: ResolveAuthHasherOptions,
): boolean => {
	if (options.allowDevFallback === true) {
		return true;
	}

	return shouldAllowLocalAuthFallback(event) || isLocalHost(event.url);
};

export const resolveAuthHasherBinding = (
	event: EventLike,
	options: ResolveAuthHasherOptions = {},
): AuthHasherBinding | null => {
	return resolveAuthPasswordHasherBinding(event, {
		allowMissingBinding: options.allowDevFallback ?? shouldAllowLocalAuthFallback(event),
		missingBindingMessage:
			'Missing AUTH_HASHER service binding. Bind AUTH_HASHER to the internal auth hasher Worker for Cloudflare runtime.',
	});
};

export const createAuthPasswordHasher = (
	event: EventLike,
	options: ResolveAuthHasherOptions = {},
): AuthPasswordHasher => {
	return createBetterAuthPasswordHasher(event, {
		allowMissingBinding: options.allowDevFallback ?? shouldAllowLocalAuthFallback(event),
		missingBindingMessage:
			'Missing AUTH_HASHER service binding. Bind AUTH_HASHER to the internal auth hasher Worker for Cloudflare runtime.',
		fallback: {
			hashPassword: fallbackHashPassword,
			verifyPassword: (hash, password) => fallbackVerifyPassword({ hash, password }),
		},
		shouldFallbackOnError: (error) =>
			isLocalAuthHasherProxyError(error) && shouldAllowLocalProxyFallback(event, options),
	});
};
