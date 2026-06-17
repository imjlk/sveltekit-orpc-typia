import type * as pgSchema from '@repo/db/pg-schema';
import type * as sqliteSchema from '@repo/db/schema';
import type { PostEventMessage } from '@repo/shared';
import type { EdgeGuardBinding, QueueLike } from './lib/capabilities';

export type DbSchema = typeof sqliteSchema | typeof pgSchema;

export type SelectQueryLike<T> = {
  all: () => T | Promise<T>;
};

export type DbClient = any;

export type DbRuntime = {
  db: DbClient;
  schema: DbSchema;
};

export type DbRuntimeInput = DbClient | DbRuntime;

export type AuthenticatedUser = {
  userId: string;
};

export type AppContext = {
  auth: AuthenticatedUser | null;
  request: Request;
  edgeGuard: EdgeGuardBinding | null;
  postEvents: QueueLike<PostEventMessage> | null;
};
