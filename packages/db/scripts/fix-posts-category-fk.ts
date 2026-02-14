import { Database } from "bun:sqlite";
import { fileURLToPath } from "node:url";

const defaultDbPath = fileURLToPath(new URL("../sqlite.db", import.meta.url));
const dbPath = process.argv[2] ?? process.env.DATABASE_URL ?? defaultDbPath;

const db = new Database(dbPath);

type ForeignKeyRow = {
  table: string;
  from: string;
};

const hasCategoryFk = () => {
  const rows = db.query<ForeignKeyRow, []>("pragma foreign_key_list(posts)").all();
  return rows.some((row) => row.table === "categories" && row.from === "category_id");
};

if (hasCategoryFk()) {
  console.log("posts.category_id already has a foreign key to categories.id");
  process.exit(0);
}

db.exec("PRAGMA foreign_keys=OFF;");
db.exec("BEGIN;");

try {
  db.exec("DROP TABLE IF EXISTS posts__new;");

  // Ensure existing data won't violate the new constraint.
  db.exec(`
    UPDATE posts
    SET category_id = NULL
    WHERE category_id IS NOT NULL
      AND category_id NOT IN (SELECT id FROM categories);
  `);

  db.exec(`
    CREATE TABLE posts__new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      category_id integer REFERENCES categories(id) ON UPDATE no action ON DELETE set null,
      title text NOT NULL,
      content text NOT NULL,
      created_at integer DEFAULT (unixepoch()) NOT NULL
    );
  `);

  db.exec(`
    INSERT INTO posts__new (id, category_id, title, content, created_at)
    SELECT id, category_id, title, content, created_at
    FROM posts;
  `);

  db.exec("DROP INDEX IF EXISTS posts_category_id_idx;");
  db.exec("DROP TABLE posts;");
  db.exec("ALTER TABLE posts__new RENAME TO posts;");
  db.exec("CREATE INDEX posts_category_id_idx ON posts (category_id);");

  db.exec("COMMIT;");
} catch (err) {
  try {
    db.exec("ROLLBACK;");
  } catch {
    // ignore
  }
  throw err;
} finally {
  db.exec("PRAGMA foreign_keys=ON;");
}

const fkCheck = db.query("pragma foreign_key_check").all();
if (fkCheck.length > 0) {
  console.error("foreign_key_check failed:", fkCheck);
  process.exit(1);
}

if (!hasCategoryFk()) {
  console.error("Failed to add posts.category_id foreign key");
  process.exit(1);
}

console.log("Added posts.category_id -> categories.id foreign key");

