import { sessions } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';
import { createAuth, getAuthDb } from '$lib/server/auth';

type SessionEnvelopeLike = {
	session?: {
		token?: string;
	};
};

const readSessionToken = (value: unknown): string | null => {
	if (!value || typeof value !== 'object') return null;

	const session = (value as SessionEnvelopeLike).session;
	return session && typeof session.token === 'string' && session.token.length > 0 ? session.token : null;
};

const expireAuthCookie = (event: Parameters<RequestHandler>[0], name: string) => {
	event.cookies.set(name, '', {
		expires: new Date(0),
		httpOnly: true,
		maxAge: 0,
		path: '/',
		sameSite: 'lax',
		secure: event.url.protocol === 'https:'
	});
};

export const POST: RequestHandler = async (event) => {
	const { auth } = await createAuth(event);
	const session = await auth.api.getSession({
		headers: event.request.headers
	});
	const sessionToken = readSessionToken(session);

	if (sessionToken) {
		const db = await getAuthDb(event);
		await db.delete(sessions).where(eq(sessions.token, sessionToken));
	}

	for (const cookieName of [
		'better-auth.session_token',
		'better-auth.session_data',
		'better-auth.dont_remember_token',
		'better-auth.account_data'
	]) {
		expireAuthCookie(event, cookieName);
	}

	return Response.redirect(new URL('/', event.url), 303);
};
