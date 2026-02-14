import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from '@repo/db/schema';

export type DbClient = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

