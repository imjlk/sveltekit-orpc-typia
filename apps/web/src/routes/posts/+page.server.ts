import { client } from '$lib/client';
import { createPostSchema } from '@repo/shared/modules/post/schema';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { CreatePostInput } from '@repo/shared';

export const load: PageServerLoad = async () => {
	try {
		const posts = await client.post.list();
		return { posts };
	} catch (error) {
		console.error('Failed to load posts:', error);
		return { posts: [] };
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

export const actions: Actions = {
	default: async ({ request }) => {
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
			await client.post.create(input);
			return {
				values: { title: '', content: '' },
				fieldErrors: {} as Partial<Record<keyof CreatePostInput, string>>,
				formError: '',
				success: true
			};
		} catch (error) {
			console.error('Failed to create post:', error);
			return fail(500, {
				values: { title, content },
				fieldErrors: {} as Partial<Record<keyof CreatePostInput, string>>,
				formError: 'Failed to create post'
			});
		}
	}
};
