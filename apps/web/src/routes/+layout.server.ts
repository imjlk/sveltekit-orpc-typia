import type { LayoutServerLoad } from './$types';

type SessionEnvelopeLike = {
	session?: {
		expiresAt?: Date | string;
	};
	user?: {
		id?: string;
		name?: string | null;
		email?: string | null;
		image?: string | null;
	};
};

const toIsoString = (value: Date | string | undefined): string | undefined => {
	if (!value) return undefined;
	if (value instanceof Date) return value.toISOString();

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const toPublicSession = (value: unknown) => {
	if (!value || typeof value !== 'object') return null;

	const session = (value as SessionEnvelopeLike).session;
	const user = (value as SessionEnvelopeLike).user;
	if (!session || !user || typeof user.id !== 'string') {
		return null;
	}

	return {
		session: {
			expiresAt: toIsoString(session.expiresAt)
		},
		user: {
			id: user.id,
			name: typeof user.name === 'string' ? user.name : null,
			email: typeof user.email === 'string' ? user.email : null,
			image: typeof user.image === 'string' ? user.image : null
		}
	};
};

export const load: LayoutServerLoad = async ({ locals, request }) => {
	if (!locals.auth) {
		return { session: null };
	}

	const result = await locals.auth.api.getSession({
		headers: request.headers
	});

	return {
		session: toPublicSession(result)
	};
};
