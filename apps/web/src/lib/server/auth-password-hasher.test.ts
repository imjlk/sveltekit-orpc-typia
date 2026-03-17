import { describe, expect, test } from 'bun:test';
import { createAuthPasswordHasher, resolveAuthHasherBinding } from './auth-password-hasher';

describe('auth-password-hasher', () => {
	test('uses AUTH_HASHER binding when present', async () => {
		const event = {
			url: new URL('https://starter.example.com'),
			platform: {
				env: {
					AUTH_HASHER: {
						hashPassword: async (password: string) => `hashed:${password}`,
						verifyPassword: async (hash: string, password: string) => hash === `hashed:${password}`
					}
				}
			}
		};

		const hasher = createAuthPasswordHasher(event);
		expect(resolveAuthHasherBinding(event)).not.toBeNull();
		expect(await hasher.hash('secret')).toBe('hashed:secret');
		expect(await hasher.verify({ hash: 'hashed:secret', password: 'secret' })).toBe(true);
	});

	test('falls back locally when binding is unavailable', async () => {
		const event = {
			url: new URL('http://127.0.0.1:5173'),
			platform: undefined
		};

		const hasher = createAuthPasswordHasher(event);
		const hash = await hasher.hash('local-dev-password');

		expect(typeof hash).toBe('string');
		expect(hash.length).toBeGreaterThan(0);
		expect(await hasher.verify({ hash, password: 'local-dev-password' })).toBe(true);
	});

	test('throws for missing Cloudflare AUTH_HASHER binding outside local dev', () => {
		const event = {
			url: new URL('https://starter.example.com'),
			platform: {
				env: {}
			}
		};

		expect(() => resolveAuthHasherBinding(event)).toThrow('Missing AUTH_HASHER service binding');
	});

	test('falls back on localhost when local AUTH_HASHER proxy session is unavailable', async () => {
		const event = {
			url: new URL('http://127.0.0.1:5273'),
			platform: {
				env: {
					AUTH_HASHER: {
						hashPassword: async () => {
							throw new Error(
								`Cannot access "hashPassword" as we couldn't find a local dev session for the "default" entrypoint of service "cloudflare-first-starter-auth-hasher" to proxy to.`
							);
						},
						verifyPassword: async () => {
							throw new Error(
								`Cannot access "verifyPassword" as we couldn't find a local dev session for the "default" entrypoint of service "cloudflare-first-starter-auth-hasher" to proxy to.`
							);
						}
					}
				}
			}
		};

		const hasher = createAuthPasswordHasher(event);
		const hash = await hasher.hash('password1234');

		expect(typeof hash).toBe('string');
		expect(await hasher.verify({ hash, password: 'password1234' })).toBe(true);
	});
});
