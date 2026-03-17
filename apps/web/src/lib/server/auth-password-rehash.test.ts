import { afterEach, describe, expect, test } from 'bun:test';
import { createDb } from '@repo/db/bun';
import { migrateBunSqliteWithLock } from '@repo/db/migrations';
import { accounts, users } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maybeRehashCredentialPasswordAfterEmailSignIn } from './auth-password-rehash';

const cleanupPaths = new Set<string>();

afterEach(async () => {
	await Promise.all(
		[...cleanupPaths].map(async (path) => {
			await rm(path, { force: true }).catch(() => undefined);
			await rm(`${path}.migrate.lock`, { force: true }).catch(() => undefined);
		}),
	);
	cleanupPaths.clear();
});

const createTestDb = async () => {
	const dbPath = join(tmpdir(), `cloudflare-first-starter.auth-rehash.${randomUUID()}.sqlite`);
	cleanupPaths.add(dbPath);
	const db = createDb(dbPath);
	await migrateBunSqliteWithLock(db, dbPath);
	return { db };
};

describe('auth password rehash', () => {
	test('rehashes a legacy credential hash after successful email sign-in', async () => {
		const { db } = await createTestDb();
		const userId = randomUUID();
		const now = new Date();
		const upgradedHash =
			'$argon2id$v=19$m=12288,t=3,p=1$c29tZXNhbHQxMjM0NTY$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

		await db.insert(users).values({
			id: userId,
			name: 'Starter User',
			email: 'starter@example.com',
			emailVerified: true,
			image: null,
			createdAt: now,
			updatedAt: now
		});

		await db.insert(accounts).values({
			id: randomUUID(),
			accountId: userId,
			providerId: 'credential',
			userId,
			accessToken: null,
			refreshToken: null,
			idToken: null,
			accessTokenExpiresAt: null,
			refreshTokenExpiresAt: null,
			scope: null,
			password: 'legacy-salt:abcdef',
			createdAt: now,
			updatedAt: now
		});

		const outcome = await maybeRehashCredentialPasswordAfterEmailSignIn(
			{
				url: new URL('https://starter.example.com'),
				platform: {
					env: {
						AUTH_HASHER: {
							hashPassword: async () => upgradedHash,
							verifyPassword: async () => true,
							fetch: async () =>
								new Response(
									JSON.stringify({
										algorithm: 'argon2id',
										version: '0.1.0',
										artifactSourceChecksum: 'checksum',
										preset: 'standard-2026q1',
										argon2id: {
											memoryKiB: 12 * 1024,
											timeCost: 3,
											parallelism: 1,
											outputLength: 32
										},
										rpc: ['hashPassword', 'verifyPassword'],
										owaspAligned: true
									}),
									{
										status: 200,
										headers: { 'content-type': 'application/json; charset=utf-8' }
									},
								)
						}
					}
				}
			},
			{ userId, password: 'password1234' },
			db,
		);

		expect(outcome).toEqual({
			status: 'updated',
			reasons: ['legacy-scrypt-format']
		});

		const [updatedAccount] = await db
			.select({ password: accounts.password })
			.from(accounts)
			.where(eq(accounts.userId, userId))
			.limit(1);

		expect(updatedAccount?.password).toBe(upgradedHash);
	});

	test('skips rehash when no AUTH_HASHER binding is available', async () => {
		const { db } = await createTestDb();
		const outcome = await maybeRehashCredentialPasswordAfterEmailSignIn(
			{
				url: new URL('http://127.0.0.1:5173'),
				platform: undefined
			},
			{ userId: 'missing', password: 'password1234' },
			db,
		);

		expect(outcome).toEqual({
			status: 'skipped',
			reason: 'no-binding'
		});
	});
});
