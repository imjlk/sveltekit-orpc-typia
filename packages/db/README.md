# packages/db

Database package for the starter.

This package defines the default relational layer for the template.

Contents:

- Drizzle schema in `src/schema.ts`
- checked-in SQL migrations in `drizzle/`
- Bun SQLite adapter in `src/bun.ts`
- Cloudflare D1 adapter in `src/d1.ts`
- migration helpers in `src/migrations.ts`

The schema includes:

- app tables such as `posts`, `comments`, `categories`, and `tags`
- async projection tables such as `post_activity`
- Better Auth tables such as `users`, `sessions`, `accounts`, and `verifications`
- relations that let the API keep demo data scoped to the authenticated user

Typical workflow:

1. Edit `src/schema.ts`
2. Run `bun run --cwd packages/db db:generate`
3. Commit the generated migration
4. Apply D1 migrations with `bun run --cwd packages/db db:migrate:d1`

Local Bun runtimes use a repo-scoped SQLite file in the system temp directory by default. Migrations are applied with a lightweight filesystem lock so concurrent dev servers do not race each other.

The checked-in migration files are the source of truth for both local SQLite and Cloudflare D1.

The advanced queue example writes `post_activity` rows through `apps/worker-post-events`, but it still targets the same shared D1 schema.
