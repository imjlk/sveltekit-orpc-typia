import { createServerRpcClient } from '$lib/server/rpc-client';
import type { CreatePostInput } from '@repo/shared';
import type { RequestEvent } from '@sveltejs/kit';

type EventLike = Pick<RequestEvent, 'fetch' | 'url'>;

export const listPosts = async (event: EventLike) => {
	const client = createServerRpcClient(event);
	return client.post.list();
};

export const listPostActivity = async (event: EventLike) => {
	const client = createServerRpcClient(event);
	return client.post.listActivity();
};

export const createPost = async (event: EventLike, input: CreatePostInput) => {
	const client = createServerRpcClient(event);
	return client.post.create(input);
};
