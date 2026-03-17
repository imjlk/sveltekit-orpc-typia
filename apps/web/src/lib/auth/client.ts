import { createAuthClient } from 'better-auth/svelte';

let authClient: ReturnType<typeof createAuthClient> | null = null;

export const getAuthClient = () => {
	if (!authClient) {
		authClient = createAuthClient({
			basePath: '/auth'
		});
	}

	return authClient;
};
