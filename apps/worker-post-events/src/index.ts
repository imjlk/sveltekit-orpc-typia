import { createD1Db } from '@repo/db/d1';
import { postActivity } from '@repo/db';
import type { PostEventMessage } from '@repo/shared';
import { isIgnorablePostActivityError, isPostCreatedMessage, toPostActivityInsert } from './consumer';

type Env = {
	DB: D1Database;
};

const processBatch = async (batch: MessageBatch<PostEventMessage>, env: Env) => {
	const db = createD1Db(env.DB);

	for (const message of batch.messages) {
		if (!isPostCreatedMessage(message.body)) {
			console.warn('Ignoring unsupported POST_EVENTS message body:', message.body);
			message.ack();
			continue;
		}

		try {
			await db.insert(postActivity).values(toPostActivityInsert(message.body)).onConflictDoNothing().run();
			message.ack();
		} catch (error) {
			if (isIgnorablePostActivityError(error)) {
				console.warn('Ignoring stale POST_EVENTS message:', error);
				message.ack();
				continue;
			}

			console.error('Failed to process POST_EVENTS message:', error);
			message.retry();
		}
	}
};

export default {
	async fetch() {
		return new Response('POST_EVENTS is consumer-only', { status: 404 });
	},
	async queue(batch, env) {
		await processBatch(batch, env);
	}
} satisfies ExportedHandler<Env, PostEventMessage>;
