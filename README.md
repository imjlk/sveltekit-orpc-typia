# sveltekit-orpc-typia

SvelteKit + oRPC + typia + Drizzle monorepo.

The main idea is:
- `@repo/shared` is the SSOT for contracts + runtime schemas.
- `@repo/api` exposes the server router + a `fetch(Request) => Response` handler.
- `apps/api` is just a Bun wrapper around that handler.
- `apps/web` (Cloudflare Pages) can proxy to an upstream (URL/service binding) or run the RPC handler **in-process**.

## Repo Layout

- `apps/web`: SvelteKit (adapter-cloudflare)
- `apps/api`: Bun dev server (optional)
- `packages/shared`: contracts/schemas/types/transport helpers
- `packages/api`: server implementation (router factory + fetch handler)
- `packages/db`: Drizzle schema + runtime-specific DB adapters
  - `@repo/db/bun`: Bun SQLite adapter (`bun:sqlite`)
  - `@repo/db/d1`: Cloudflare D1 adapter

## Dev

Install:
```bash
bun install
```

Run everything (shared watch + api + web, with prefixed logs):
```bash
bun run dev
```

Run web only (shared watch + web) with RPC handled in-process:
```bash
bun run dev:web:solo
```

Notes:
- `dev:web:solo` sets `ORPC_IN_PROCESS=1` and uses a local sqlite file at `/tmp/sveltekit-orpc-typia.dev.migrations.sqlite` by default.
- DB schema is applied automatically at startup from the checked-in migrations in `packages/db/drizzle` (no baseline DB copy).
- `apps/web` runs Vite via Bun (`bunx --bun vite ...`) so local in-process mode can import `@repo/db/bun` (`bun:sqlite`). Cloudflare uses D1 instead.

Run Cloudflare Pages locally (wrangler + D1 binding):
```bash
bun run dev:web:cf
```

Cloudflare notes:
- Update `apps/web/wrangler.toml` with your D1 `database_name` / `database_id`.
- Put secrets in `apps/web/.dev.vars` (see `apps/web/.dev.vars.example`). Wrangler will load `.dev.vars` automatically.
- Quick smoke (local Pages runtime + local D1 + migrations):
```bash
bun run smoke:web:cf
```

## RPC Routing (apps/web)

`apps/web/src/routes/rpc/[...path]/+server.ts` is the single gateway endpoint.

Path shape:
- `/rpc/<router>/<procedure>`

Upstream resolution order:
1. Per-router Cloudflare service binding:
   - `ORPC_POST` (binding object), or
   - `ORPC_POST_BINDING="BINDING_NAME"` + `BINDING_NAME` (binding object)
2. Per-router URL:
   - `ORPC_POST_URL="https://.../rpc"` (or base url, `/rpc` is appended)
3. Default binding:
   - `ORPC_DEFAULT` / `ORPC_API` (binding), or `*_BINDING` indirection
4. Default URL:
   - `ORPC_API_URL` / `ORPC_DEFAULT_URL` / (Node) `ORPC_API_URL` / `VITE_API_URL`
5. In-process mode:
   - `ORPC_IN_PROCESS=1`
6. Fallback:
   - `http://127.0.0.1:3000/rpc`

In-process DB selection:
- Cloudflare runtime: uses D1 binding `DB` (override name with `ORPC_DB_BINDING`)
- Local dev (Bun): uses sqlite via `@repo/db/bun` (respects `DATABASE_URL` if set)

## DB Migrations

Migrations are the SSOT and are checked in at `packages/db/drizzle/`.

Generate migrations (after editing `packages/db/src/schema.ts`):
```bash
bun run --cwd packages/db db:generate
```

Apply migrations:
- Local sqlite (`packages/db/sqlite.db`): `bun run --cwd packages/db db:migrate`
- Cloudflare D1 (via API token): `bun run --cwd packages/db db:migrate:d1` (requires `CF_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_API_TOKEN`)

Runtime auto-migration:
- `apps/api` and `apps/web` (Bun sqlite fallback) run `drizzle-orm` migrator on boot using `@repo/db/migrations`.

## Tests

Run e2e:
```bash
bun run test:e2e
```

Run e2e against the in-process Pages-style `/rpc` handler (web-only):
```bash
bun run test:e2e:solo
```

E2E notes:
- `scripts/e2e-api.ts` starts `apps/api` at `127.0.0.1:3001` with a fresh temp sqlite DB file and relies on runtime migrations.

## Cloudflare Notes

- Pages can either:
  - proxy `/rpc` to dedicated API Workers via service bindings, or
  - handle RPC in-process (single deployment) using D1.
- Hyperdrive is Postgres-focused; this repo currently uses SQLite (Bun sqlite / D1). Supporting Hyperdrive would require a Postgres schema/adapter track.
