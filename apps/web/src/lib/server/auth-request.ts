import type { RequestEvent } from '@sveltejs/kit';
import { parseSetCookieHeader, splitSetCookieHeader } from 'better-auth/cookies';
import { createAuth } from './auth';

export const getSetCookieHeaders = (response: Response): string[] => {
	const getSetCookie = Reflect.get(response.headers, 'getSetCookie');
	if (typeof getSetCookie === 'function') {
		const values = getSetCookie.call(response.headers);
		if (Array.isArray(values)) {
			return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
		}
	}

	const setCookie = response.headers.get('set-cookie');
	return typeof setCookie === 'string' && setCookie.length > 0 ? splitSetCookieHeader(setCookie) : [];
};

const applySetCookieHeaders = (event: RequestEvent, response: Response) => {
	for (const setCookie of getSetCookieHeaders(response)) {
		const cookies = parseSetCookieHeader(setCookie);
		for (const [name, cookie] of cookies) {
			event.cookies.set(name, cookie.value, {
				domain: cookie.domain,
				expires: cookie.expires,
				httpOnly: cookie.httponly,
				maxAge: cookie['max-age'],
				path: cookie.path || '/',
				sameSite: cookie.samesite,
				secure: cookie.secure
			});
		}
	}
};

export const executeAuthJsonAction = async <T>(
	event: RequestEvent,
	path: string,
	body?: Record<string, unknown>,
): Promise<{ data: T | null; response: Response }> => {
	const { auth } = await createAuth(event);
	const headers = new Headers({
		'content-type': 'application/json'
	});

	for (const name of ['cookie', 'origin', 'referer']) {
		const value = event.request.headers.get(name);
		if (value) {
			headers.set(name, value);
		}
	}

	const response = await auth.handler(
		new Request(new URL(path, event.url), {
			method: 'POST',
			headers,
			body: body ? JSON.stringify(body) : undefined
		}),
	);

	applySetCookieHeaders(event, response);

	let data: T | null = null;
	if ((response.headers.get('content-type') ?? '').includes('application/json')) {
		data = (await response.clone().json()) as T;
	}

	return { data, response };
};
