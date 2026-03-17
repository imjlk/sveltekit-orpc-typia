import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const repoHash = createHash("sha1").update(repoRoot).digest("hex").slice(0, 12);

export const defaultDbPath = resolve(tmpdir(), `cloudflare-first-starter.${repoHash}.sqlite`);

export function createDb(url = process.env.DATABASE_URL ?? defaultDbPath) {
  const sqlite = new Database(url, { create: true });
  sqlite.exec("PRAGMA foreign_keys=ON");
  return drizzle(sqlite, { schema });
}
