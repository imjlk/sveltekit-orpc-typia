import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

export * from "./schema";

const defaultDbPath = fileURLToPath(new URL("../sqlite.db", import.meta.url));

export function createDb(url = defaultDbPath) {
  const sqlite = new Database(url, { create: true });
  return drizzle(sqlite, { schema });
}
