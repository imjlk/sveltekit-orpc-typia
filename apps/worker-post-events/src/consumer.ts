import type { PostActivityInsertRow } from '@repo/db/schema-types';
import type { PostEventMessage } from '@repo/shared';

export const isPostCreatedMessage = (value: unknown): value is PostEventMessage => {
	if (!value || typeof value !== 'object') return false;

	const candidate = value as Partial<PostEventMessage>;
	return (
		candidate.type === 'post.created' &&
		typeof candidate.eventId === 'string' &&
		typeof candidate.postId === 'number' &&
		typeof candidate.userId === 'string' &&
		typeof candidate.createdAt === 'string'
	);
};

export const toPostActivityInsert = (
	message: PostEventMessage
): Pick<PostActivityInsertRow, 'eventId' | 'postId' | 'userId' | 'type'> => ({
	eventId: message.eventId,
	postId: message.postId,
	userId: message.userId,
	type: message.type
});

export const isIgnorablePostActivityError = (error: unknown): boolean => {
	const message = error instanceof Error ? error.message : String(error ?? '');
	return /foreign key constraint failed/i.test(message);
};
