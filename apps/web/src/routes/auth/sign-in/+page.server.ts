import { executeAuthJsonAction } from '$lib/server/auth-request';
import { fail, redirect } from '@sveltejs/kit';
import { normalizeNextPath } from '$lib/auth/next';
import { resolveSocialAuth } from '$lib/server/auth-social';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const nextPath = normalizeNextPath(event.url.searchParams.get('next'));
	const { session } = await event.parent();
	if (session?.user?.id) {
		throw redirect(303, nextPath);
	}

	return {
		githubEnabled: resolveSocialAuth(event).githubEnabled,
		nextPath
	};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const nextPath = normalizeNextPath(String(formData.get('next') ?? ''));

		const { data, response } = await executeAuthJsonAction<{ message?: string }>(
			event,
			'/auth/sign-in/email',
			{
				email,
				password,
				rememberMe: true
			},
		);

		if (!response.ok) {
			return fail(response.status, {
				values: { email },
				formError: data?.message ?? 'Unable to sign in.'
			});
		}

		throw redirect(303, nextPath);
	}
};
