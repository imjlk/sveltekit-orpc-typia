import { open, rm, stat } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

// Used by Node/Bun runtimes to apply migrations from the checked-in `packages/db/drizzle` folder.
export const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const migrationLockPollMs = 50;
const migrationLockStaleMs = 30_000;

const acquireMigrationLock = async (dbPath: string) => {
  const lockPath = `${dbPath}.migrate.lock`;

  while (true) {
    try {
      const handle = await open(lockPath, 'wx');
      return { handle, lockPath };
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
      if (code !== 'EEXIST') {
        throw error;
      }

      try {
        const lockStat = await stat(lockPath);
        if (Date.now() - lockStat.mtimeMs > migrationLockStaleMs) {
          await rm(lockPath, { force: true });
          continue;
        }
      } catch (statError) {
        const statCode =
          statError instanceof Error && 'code' in statError ? String((statError as { code?: unknown }).code ?? '') : '';
        if (statCode !== 'ENOENT') {
          throw statError;
        }
      }

      await sleep(migrationLockPollMs);
    }
  }
};

// Convenience helper for Bun sqlite runtimes (apps/api, local in-process /rpc).
export const migrateBunSqlite = (db: BunSQLiteDatabase<Record<string, unknown>>) => {
  migrate(db, { migrationsFolder });
};

export const migrateBunSqliteWithLock = async (
  db: BunSQLiteDatabase<Record<string, unknown>>,
  dbPath: string,
) => {
  const { handle, lockPath } = await acquireMigrationLock(dbPath);

  try {
    migrateBunSqlite(db);
  } finally {
    await handle.close();
    await rm(lockPath, { force: true });
  }
};
