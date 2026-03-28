import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWranglerCommand } from './_wrangler-cli';

type Journal = {
  entries: Array<{
    tag: string;
    when: number;
  }>;
};

type Migration = {
  tag: string;
  fileName: string;
  filePath: string;
  folderMillis: number;
  hash: string;
};

export type ApplyLocalD1MigrationsOptions = {
  webCwd: string;
  drizzleDir: string;
  persistDir: string;
  binding?: string;
  log?: (...args: unknown[]) => void;
};

type WranglerD1ExecuteJson = Array<{
  results?: Array<Record<string, unknown>>;
  success: boolean;
  meta?: Record<string, unknown>;
}>;

const DEFAULT_BINDING = 'DB';
const DRIZZLE_MIGRATIONS_TABLE = '__drizzle_migrations';
const LEGACY_APPLIED_MARKER = '.drizzle-migrations.applied.json';

const readLegacyApplied = (persistDir: string): string[] => {
  const markerPath = resolve(persistDir, LEGACY_APPLIED_MARKER);
  if (!existsSync(markerPath)) return [];

  try {
    const text = readFileSync(markerPath, 'utf8');
    const json = JSON.parse(text) as unknown;
    if (Array.isArray(json) && json.every((v) => typeof v === 'string')) return json;
  } catch {
    // ignore
  }

  return [];
};

const readDrizzleJournalMigrations = (drizzleDir: string): Migration[] => {
  const journalPath = resolve(drizzleDir, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as Journal;

  const migrations: Migration[] = journal.entries.map((entry) => {
    const fileName = `${entry.tag}.sql`;
    const filePath = resolve(drizzleDir, fileName);
    const sql = readFileSync(filePath, 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');

    return {
      tag: entry.tag,
      fileName,
      filePath,
      folderMillis: entry.when,
      hash,
    };
  });

  migrations.sort((a, b) => a.folderMillis - b.folderMillis);
  return migrations;
};

const runJson = async (cmd: string[], cwd: string): Promise<unknown> => {
  const child = Bun.spawn({
    cmd,
    cwd,
    stdout: 'pipe',
    stderr: 'inherit',
    env: process.env,
  });

  const stdout = child.stdout ? await new Response(child.stdout).text() : '';
  const code = await child.exited;
  if (code !== 0) {
    throw new Error(`Command failed (${code}): ${cmd.join(' ')}`);
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse JSON output for: ${cmd.join(' ')}`);
  }
};

export const applyLocalD1Migrations = async (options: ApplyLocalD1MigrationsOptions) => {
  const binding = options.binding ?? DEFAULT_BINDING;
  const log = options.log ?? (() => {});

  mkdirSync(options.persistDir, { recursive: true });

  const migrations = readDrizzleJournalMigrations(options.drizzleDir);
  if (migrations.length === 0) {
    throw new Error(`No drizzle migrations found in ${options.drizzleDir}`);
  }

  const d1ExecuteJson = async (args: string[]) =>
    (await runJson(
      createWranglerCommand([
        'd1',
        'execute',
        binding,
        '--cwd',
        options.webCwd,
        '--local',
        '--persist-to',
        options.persistDir,
        '--json',
        '--yes',
        ...args,
      ]),
      process.cwd(),
    )) as WranglerD1ExecuteJson;

  const ensureMigrationsTable = async () => {
    // Matches drizzle-orm/d1 migrator schema.
    await d1ExecuteJson([
      '--command',
      `CREATE TABLE IF NOT EXISTS ${DRIZZLE_MIGRATIONS_TABLE} (\n\tid SERIAL PRIMARY KEY,\n\thash text NOT NULL,\n\tcreated_at numeric\n);`,
    ]);
  };

  const getLastAppliedMillis = async (): Promise<number | undefined> => {
    const out = await d1ExecuteJson([
      '--command',
      `SELECT created_at FROM ${DRIZZLE_MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
    ]);

    const row = out?.[0]?.results?.[0] as { created_at?: unknown } | undefined;
    const value = row?.created_at;
    if (value === undefined || value === null) return undefined;

    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const insertMigration = async (migration: Migration) => {
    await d1ExecuteJson([
      '--command',
      `INSERT INTO ${DRIZZLE_MIGRATIONS_TABLE} ("hash", "created_at") VALUES('${migration.hash}', '${migration.folderMillis}')`,
    ]);
  };

  await ensureMigrationsTable();

  let lastApplied = await getLastAppliedMillis();

  if (lastApplied === undefined) {
    const legacyApplied = readLegacyApplied(options.persistDir);
    if (legacyApplied.length > 0) {
      const toAdopt = migrations.filter((m) => legacyApplied.includes(m.fileName));
      if (toAdopt.length > 0) {
        log('adopt legacy migration markers into __drizzle_migrations');
        for (const migration of toAdopt) {
          await insertMigration(migration);
        }
        lastApplied = await getLastAppliedMillis();
      }
    }
  }

  const pending = migrations.filter((m) => lastApplied === undefined || lastApplied < m.folderMillis);
  if (pending.length === 0) {
    log('migrations: up-to-date');
    return;
  }

  for (const migration of pending) {
    log('apply migration:', migration.fileName);
    try {
      await d1ExecuteJson(['--file', migration.filePath]);
      await insertMigration(migration);
      lastApplied = migration.folderMillis;
    } catch (err) {
      log('migration failed. If this is due to an existing local D1 schema, run: bun run dev:web:cf:reset');
      throw err;
    }
  }
};
