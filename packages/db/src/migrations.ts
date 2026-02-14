import { fileURLToPath } from 'node:url';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

// Used by Node/Bun runtimes to apply migrations from the checked-in `packages/db/drizzle` folder.
export const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

// Convenience helper for Bun sqlite runtimes (apps/api, local in-process /rpc).
export const migrateBunSqlite = (db: BunSQLiteDatabase<Record<string, unknown>>) => {
  migrate(db, { migrationsFolder });
};
