import { describe, expect, test } from 'bun:test';
import { isIgnorablePostActivityError, isPostCreatedMessage, toPostActivityInsert } from './consumer';

describe('post events consumer helpers', () => {
	test('validates post.created messages', () => {
		expect(
			isPostCreatedMessage({
				type: 'post.created',
				eventId: 'evt_123',
				postId: 1,
				userId: 'user_123',
				createdAt: new Date('2026-03-10T00:00:00.000Z').toISOString()
			})
		).toBe(true);
		expect(isPostCreatedMessage({ type: 'post.deleted' })).toBe(false);
	});

	test('maps queue messages into post_activity inserts', () => {
		expect(
			toPostActivityInsert({
				type: 'post.created',
				eventId: 'evt_123',
				postId: 5,
				userId: 'user_5',
				createdAt: '2026-03-10T00:00:00.000Z'
			})
		).toEqual({
			eventId: 'evt_123',
			postId: 5,
			userId: 'user_5',
			type: 'post.created'
		});
	});

	test('treats missing foreign key rows as ignorable', () => {
		expect(isIgnorablePostActivityError(new Error('FOREIGN KEY constraint failed'))).toBe(true);
		expect(isIgnorablePostActivityError(new Error('random failure'))).toBe(false);
	});
});
