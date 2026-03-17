import * as schema from '@repo/db/schema';
import { createD1Db } from '@repo/db/d1';
import { resolveAuthBridgeSecret } from '@repo/shared';
import type { RequestEvent } from '@sveltejs/kit';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth } from 'better-auth/minimal';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { createAuthPasswordHasher } from './auth-password-hasher';
import { isCloudflareRuntime, shouldAllowLocalAuthFallback } from './auth-runtime';
import { resolveSocialAuth } from './auth-social';

type LocalAuthDb = ReturnType<typeof import('@repo/db/bun').createDb>;
type AuthDb = LocalAuthDb | ReturnType<typeof createD1Db>;

let localDbPromise: Promise<LocalAuthDb> | null = null;

const importRuntimeModule = <T>(specifier: string): Promise<T> =>
	import(/* @vite-ignore */ specifier) as Promise<T>;

const getLocalDb = async (): Promise<LocalAuthDb> => {
	if (!localDbPromise) {
		localDbPromise = (async () => {
			const [{ createDb, defaultDbPath }, { migrateBunSqliteWithLock }] = await Promise.all([
				importRuntimeModule<typeof import('@repo/db/bun')>('@repo/db/bun'),
				importRuntimeModule<typeof import('@repo/db/migrations')>('@repo/db/migrations')
			]);
			const localDbPath = process.env.AUTH_DATABASE_URL ?? process.env.DATABASE_URL ?? defaultDbPath;
			const db = createDb(localDbPath);
			await migrateBunSqliteWithLock(db, localDbPath);
			return db;
		})();
	}

	return localDbPromise;
};

export const getAuthDb = async (event: RequestEvent): Promise<AuthDb> => {
	const platformDb = event.platform?.env?.DB;
	if (platformDb && isCloudflareRuntime(event)) {
		return createD1Db(platformDb);
	}

	return getLocalDb();
};

const resolveAuthBaseUrl = (event: RequestEvent): string => {
	const configuredUrl = event.platform?.env?.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL;
	if (typeof configuredUrl === 'string' && configuredUrl.trim().length > 0) {
		return configuredUrl.trim();
	}

	if (shouldAllowLocalAuthFallback(event)) {
		return event.url.origin;
	}

	throw new Error('Missing BETTER_AUTH_URL.');
};

const resolveAuthSecret = (event: RequestEvent): string =>
	resolveAuthBridgeSecret(event.platform?.env, {
		allowDevFallback: shouldAllowLocalAuthFallback(event)
	});

export const createAuth = async (event: RequestEvent) => {
	const db = await getAuthDb(event);
	const { socialProviders } = resolveSocialAuth(event);
	const auth = betterAuth({
		baseURL: resolveAuthBaseUrl(event),
		basePath: '/auth',
		secret: resolveAuthSecret(event),
		trustedOrigins: [event.url.origin],
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema,
			usePlural: true
		}),
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
			password: createAuthPasswordHasher(event, {
				allowDevFallback: shouldAllowLocalAuthFallback(event)
			})
		},
		...(socialProviders ? { socialProviders } : {}),
		plugins: [sveltekitCookies(() => event)]
	});

	return { auth };
};
