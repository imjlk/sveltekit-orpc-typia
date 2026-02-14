import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

export * from "./schema";

const defaultDbPath = fileURLToPath(new URL("../sqlite.db", import.meta.url));

export function createDb(url = process.env.DATABASE_URL ?? defaultDbPath) {
  const sqlite = new Database(url, { create: true });
  sqlite.exec("PRAGMA foreign_keys=ON");
  return drizzle(sqlite, { schema });
}
