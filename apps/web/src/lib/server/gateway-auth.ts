import { createAuthBridgeHeaders } from '@repo/shared';
import type { RequestEvent } from '@sveltejs/kit';
import { createAuth } from './auth';
import { shouldAllowLocalAuthFallback } from './auth-runtime';

type SessionEnvelopeLike = {
	user?: {
		id?: string;
	};
};

const readSessionUserId = (value: unknown): string | null => {
	if (!value || typeof value !== 'object') return null;
	const userId = (value as SessionEnvelopeLike).user?.id;
	return typeof userId === 'string' && userId.trim().length > 0 ? userId.trim() : null;
};

const resolveAuthSecret = (event: RequestEvent): string => {
	const value = event.platform?.env?.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
	if (typeof value === 'string' && value.trim().length > 0) {
		return value.trim();
	}

	if (shouldAllowLocalAuthFallback(event)) {
		return 'dev-better-auth-secret-change-me';
	}

	throw new Error('Missing BETTER_AUTH_SECRET.');
};

export const getGatewayInternalHeaders = async (
	event: Pick<RequestEvent, 'platform' | 'request' | 'url'>,
): Promise<Record<string, string | undefined>> => {
	const { auth } = await createAuth(event as RequestEvent);
	const session = await auth.api.getSession({
		headers: event.request.headers
	});
	const userId = readSessionUserId(session);

	if (!userId) {
		return {};
	}

	return createAuthBridgeHeaders(userId, resolveAuthSecret(event as RequestEvent));
};
