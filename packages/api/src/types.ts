import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from '@repo/db/schema';
import type { PostEventMessage } from '@repo/shared';
import type { EdgeGuardBinding, QueueLike } from './lib/capabilities';

export type DbClient = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

export type AuthenticatedUser = {
  userId: string;
};

export type AppContext = {
  auth: AuthenticatedUser | null;
  request: Request;
  edgeGuard: EdgeGuardBinding | null;
  postEvents: QueueLike<PostEventMessage> | null;
};
