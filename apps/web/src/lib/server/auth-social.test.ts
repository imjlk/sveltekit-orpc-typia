import { describe, expect, test } from 'bun:test';
import { resolveGitHubProvider, resolveSocialAuth } from './auth-social';

describe('auth-social', () => {
	test('returns null when GitHub credentials are missing', () => {
		const event = { platform: { env: {} } };

		expect(resolveGitHubProvider(event)).toBeNull();
		expect(resolveSocialAuth(event).githubEnabled).toBe(false);
	});

	test('returns GitHub provider when credentials are present', () => {
		const event = {
			platform: {
				env: {
					GITHUB_CLIENT_ID: 'github-client-id',
					GITHUB_CLIENT_SECRET: 'github-client-secret'
				}
			}
		};

		expect(resolveGitHubProvider(event)).toEqual({
			clientId: 'github-client-id',
			clientSecret: 'github-client-secret'
		});
		expect(resolveSocialAuth(event).githubEnabled).toBe(true);
	});
});
