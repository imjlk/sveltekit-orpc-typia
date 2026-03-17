import type { RequestEvent } from '@sveltejs/kit';

type EventLike = Pick<RequestEvent, 'platform'>;

type GitHubProviderConfig = {
	clientId: string;
	clientSecret: string;
};

const readString = (value: unknown): string | undefined => {
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim();
	return normalized.length > 0 ? normalized : undefined;
};

const readEnv = (event: EventLike, key: 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'): string | undefined =>
	readString(event.platform?.env?.[key]) ?? readString(process.env[key]);

export const resolveGitHubProvider = (event: EventLike): GitHubProviderConfig | null => {
	const clientId = readEnv(event, 'GITHUB_CLIENT_ID');
	const clientSecret = readEnv(event, 'GITHUB_CLIENT_SECRET');

	if (!clientId || !clientSecret) {
		return null;
	}

	return {
		clientId,
		clientSecret
	};
};

export const resolveSocialAuth = (event: EventLike) => {
	const github = resolveGitHubProvider(event);

	return {
		githubEnabled: github !== null,
		socialProviders: github
			? {
					github
				}
			: undefined
	};
};
