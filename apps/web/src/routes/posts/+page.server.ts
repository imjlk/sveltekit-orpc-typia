import { createPost, listPostActivity, listPosts } from '$lib/server/modules/post/service';
import { buildAuthNextQuery } from '$lib/auth/next';
import type { RateLimitedData } from '@repo/shared';
import { createPostSchema } from '@repo/shared/modules/post/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { CreatePostInput } from '@repo/shared';

export const load: PageServerLoad = async (event) => {
	const { session } = await event.parent();
	if (!session?.user?.id) {
		throw redirect(303, `/auth/sign-in${buildAuthNextQuery('/posts')}`);
	}

	try {
		const [posts, activity] = await Promise.all([listPosts(event), listPostActivity(event)]);
		return { posts, activity, session };
	} catch (error) {
		console.error('Failed to load posts:', error);
		return { posts: [], activity: [], session };
	}
};

const normalizeIssueMessage = (message: string): string => {
	return message.includes('MinLength<1>') ? 'Required' : message;
};

const pathSegmentToString = (segment: unknown): string => {
	if (typeof segment === 'string' || typeof segment === 'number') {
		return String(segment);
	}

	if (segment && typeof segment === 'object' && 'key' in segment) {
		const key = (segment as { key?: unknown }).key;
		return typeof key === 'string' || typeof key === 'number' ? String(key) : '';
	}

	return '';
};

const mapFieldErrors = (
	issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<unknown> }>
): Partial<Record<keyof CreatePostInput, string>> => {
	const errors: Partial<Record<keyof CreatePostInput, string>> = {};

	for (const issue of issues) {
		const segments = issue.path?.map(pathSegmentToString).filter(Boolean) ?? [];
		const field = segments[0];

		if (field === 'title' || field === 'content') {
			errors[field] = normalizeIssueMessage(issue.message);
		}
	}

	return errors;
};

const isRateLimitedError = (
	error: unknown
): error is { code: 'TOO_MANY_REQUESTS'; data?: RateLimitedData; message?: string } =>
	!!error &&
		typeof error === 'object' &&
		'code' in error &&
		(error as { code?: unknown }).code === 'TOO_MANY_REQUESTS';

const buildRateLimitMessage = (error: { data?: RateLimitedData; message?: string }): string => {
	const retryAfterSeconds = error.data?.retryAfterSeconds;
	if (typeof retryAfterSeconds === 'number' && retryAfterSeconds > 0) {
		return `${error.message ?? 'Too many requests.'} Try again in ${retryAfterSeconds}s.`;
	}

	return error.message ?? 'Too many requests. Try again shortly.';
};

export const actions: Actions = {
	default: async (event) => {
		const sessionResult = event.locals.auth
			? await event.locals.auth.api.getSession({
					headers: event.request.headers
				})
			: null;
		const userId =
			sessionResult &&
			typeof sessionResult === 'object' &&
			'user' in sessionResult &&
			sessionResult.user &&
			typeof sessionResult.user === 'object' &&
			'id' in sessionResult.user &&
			typeof sessionResult.user.id === 'string'
				? sessionResult.user.id
				: null;

		if (!userId) {
			throw redirect(303, `/auth/sign-in${buildAuthNextQuery('/posts')}`);
		}

		const { request } = event;
		const formData = await request.formData();
		const title = String(formData.get('title') ?? '');
		const content = String(formData.get('content') ?? '');

		const input: CreatePostInput = {
			title: title as CreatePostInput['title'],
			content: content as CreatePostInput['content']
		};

		const validationResult = await createPostSchema['~standard'].validate(input);
		if (validationResult.issues?.length) {
			return fail(400, {
				values: { title, content },
				fieldErrors: mapFieldErrors(validationResult.issues),
				formError: ''
			});
		}

		try {
			await createPost(event, input);
			return {
				values: { title: '', content: '' },
				fieldErrors: {} as Partial<Record<keyof CreatePostInput, string>>,
				formError: '',
				success: true
			};
		} catch (error) {
			console.error('Failed to create post:', error);
			if (isRateLimitedError(error)) {
				return fail(429, {
					values: { title, content },
					fieldErrors: {} as Partial<Record<keyof CreatePostInput, string>>,
					formError: buildRateLimitMessage(error)
				});
			}

			return fail(500, {
				values: { title, content },
				fieldErrors: {} as Partial<Record<keyof CreatePostInput, string>>,
				formError: 'Failed to create post'
			});
		}
	}
};
