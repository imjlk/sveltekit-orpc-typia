---
description: Working conventions for the Cloudflare First Starter Bun monorepo
globs: "package.json,*.ts,*.js,*.svelte,*.json,*.toml,README.md,README_ko.md,apps/**,packages/**,scripts/**,.github/**"
alwaysApply: false
---

Use Bun across the repo.

- Use `bun`, `bun run`, `bun test`, and `bunx` instead of Node/npm/pnpm/yarn wrappers.
- Prefer Bun-native process APIs such as `Bun.spawn`.
- Prefer `Bun.file` or `Bun.write` for new file IO unless an existing script already depends on Node stdlib helpers.

## Starter Positioning

This repository is a Cloudflare-first public starter, not an infra-agnostic template.

Default shipped stack:

- SvelteKit on Cloudflare Pages
- oRPC + typia for contract-first APIs
- Drizzle + D1 as the default database path
- Better Auth under `/auth/*`
- optional Cloudflare service-binding splits
- `AUTH_HASHER` as a TypeScript Worker shell backed by a Rust Wasm kernel

Keep that positioning honest in code and docs.

## Repo Shape

1. `packages/db`
   - Drizzle schema, runtime adapters, and checked-in SQL migrations.
   - `@repo/db/bun` is for Bun or local SQLite.
   - `@repo/db/d1` is for Cloudflare D1.
2. `packages/shared`
   - SSOT for contracts, runtime schemas, transport helpers, shared error shapes, and auth bridge helpers.
3. `packages/auth-hasher-contracts`
   - preset definitions, metadata types, and password hash assessment helpers.
4. `packages/auth-hasher-client`
   - service-binding resolution helpers, proxy error helpers, and rehash helpers.
5. `packages/auth-hasher-better-auth-adapter`
   - Better Auth-facing adapter glue for `AUTH_HASHER`.
6. `packages/auth-hasher`
   - compatibility barrel that re-exports the split auth hasher packages.
7. `packages/api`
   - oRPC router implementations plus reusable `/rpc` and `/api` fetch handlers.
8. `packages/gateway`
   - shared upstream resolution and proxy or in-process routing for SvelteKit server routes.
9. `apps/api`
   - Bun runtime wrapper around `@repo/api`.
10. `apps/web`
   - SvelteKit app on Cloudflare Pages.
   - serves UI plus `/auth`, `/rpc`, and `/api`
11. `apps/worker-content`, `apps/worker-meta`
   - optional split Cloudflare Workers for service-binding deployments.
12. `apps/auth-hasher-worker`
   - `AUTH_HASHER` service Worker.
   - TypeScript `WorkerEntrypoint` shell plus Rust Wasm kernel crates.

## Commands

- Install: `bun install`
- Full local dev: `bun run dev`
- Web only, in-process RPC: `bun run dev:web:solo`
- Web on local Cloudflare Pages + D1: `bun run dev:web:cf`
- Web on local Pages + split Worker services: `bun run dev:web:cf:services`
- Build: `bun run build`
- Type and app checks: `bun run check`
- Gateway unit test: `bun test packages/gateway/src/resolver.test.ts`
- Auth bridge unit test: `bun test packages/shared/test/auth-bridge.test.ts`
- Web auth helper tests:
  - `bun test apps/web/src/lib/server/auth-social.test.ts`
  - `bun test apps/web/src/lib/server/auth-password-hasher.test.ts`
  - `bun test apps/web/src/lib/server/auth-password-rehash.test.ts`
- Auth hasher contract and client tests:
  - `bun test packages/auth-hasher-contracts/test/index.test.ts`
  - `bun test packages/auth-hasher-client/test/index.test.ts`
- Auth hasher Worker tests:
  - `bun test apps/auth-hasher-worker/src/fetch-handler.test.ts`
  - `bun test apps/auth-hasher-worker/src/kernel-node.test.ts`
- Auth hasher Rust kernel check:
  - `cargo check --manifest-path apps/auth-hasher-worker/Cargo.toml --target wasm32-unknown-unknown`
- Web e2e: `bun run test:e2e`
- Generate OpenAPI: `bun run gen:openapi`
- Verify checked-in OpenAPI output: `bun run verify:openapi`

## Domain Change Workflow

When adding or changing a domain, update the SSOT layers in order:

1. Database
   - edit `packages/db/src/schema.ts`
   - generate migration SQL with `bun run --cwd packages/db db:generate`
2. Shared contract and types
   - update `packages/shared/src/modules/<domain>/types.ts`
   - update `packages/shared/src/modules/<domain>/schema.ts`
   - update `packages/shared/src/modules/<domain>/contract.ts`
3. API implementation
   - update `packages/api/src/modules/<domain>/router.ts`
4. Registration and routing
   - update `packages/shared/src/contracts/registry.ts`
   - update `packages/shared/src/contracts/services.ts` if the router participates in service splits
   - update `packages/api/src/router.ts`
   - update `packages/api/src/routers.ts` for split content or meta workers
5. Runtime usage and docs
   - update `apps/web` and docs after the contract and API layers are correct

For new domains, prefer starting from:

- `bun scripts/scaffold-domain.ts --name <name> --table <table> --group <content|meta|none>`

When contracts change, regenerate the checked-in specs:

- `bun run gen:openapi`

## Routing And Runtime Rules

- `/auth/*` is reserved for Better Auth.
- `/rpc/*` and `/api/*` gateway behavior lives in `packages/gateway/src/resolver.ts` and `packages/gateway/src/handler.ts`.
- Preserve the upstream resolution order:
  - per-router service binding
  - per-router URL
  - default binding
  - default URL
  - in-process handler
  - localhost fallback
- In-process mode is controlled by `ORPC_IN_PROCESS=1`.
- Bun or local runtime uses SQLite through `@repo/db/bun`.
- Cloudflare runtime uses D1 through `@repo/db/d1`.
- The gateway should pass authenticated user state through the signed auth bridge headers, not by leaking Better Auth session internals into downstream apps.

## Auth Rules

- Better Auth lives only in `apps/web`.
- `/rpc` and `/api` consumers should see authenticated user state through the shared auth bridge.
- Cloudflare runtime requires `AUTH_HASHER`.
- Local non-Cloudflare dev may fall back to Better Auth's built-in password hashing.
- GitHub is the only social provider shipped in v1.
- Keep auth under `/auth/*`, not `/api/auth/*`.

## Docs Rules

- English is the default language for docs.
- If you add Korean translations, use the `_ko` suffix:
  - `README_ko.md`
  - `docs/foo_ko.md`
- Do not leave placeholder starter text in package READMEs or landing pages.

## Editing Guidance

- Prefer fixing behavior in `packages/shared`, `packages/api`, or `packages/gateway` before patching runtime apps.
- Keep oRPC and OpenAPI behavior aligned.
- Shared transport and error normalization lives in:
  - `packages/api/src/handler.ts`
  - `packages/api/src/openapi.ts`
  - `packages/api/src/lib/errors.ts`
- If you touch workspace imports used by `apps/web`, keep SvelteKit aliasing and Vite aliasing in sync.
  - SvelteKit aliases live in `apps/web/svelte.config.js`.
- OpenAPI files under `apps/web/static/openapi/` are generated artifacts. Do not hand-edit them.

## Current Caveats

- Most coverage is still around gateway resolution, auth helpers, and the main web flow. Backend module-level tests remain relatively light.
- The starter is optimized around D1 first. KV, DO, Hyperdrive, and R2 are typed and documented but not wired into the default runtime path.
