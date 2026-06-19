# apps/web

Public app shell for the Cloudflare First Starter.

This package owns the browser-facing runtime:

- the landing page and protected demo flows
- Better Auth mounted at `/auth/*`
- gateway entry points for `/rpc/*` and `/api/*`
- checked-in OpenAPI assets under `static/openapi/`
- Cloudflare Pages runtime bindings and local dev parity
- shared `AUTH_HASHER` helpers from `@repo/auth-hasher-contracts`, `@repo/auth-hasher-client`,
  and `@repo/auth-hasher-better-auth-adapter`

Key routes:

- `/`
  public template landing page
- `/auth/*`
  sign-up, sign-in, and Better Auth handler surface
- `/posts`
  minimal protected CRUD example scoped to the signed-in user
- `/og.png`
  optional OG image route backed by the `OG_WORKER` capability example
- `/api/docs`
  Scalar UI for the checked-in REST spec
- `/api/docs/rpc`
  Scalar UI for the Standard RPC wrapper spec

Runtime modes:

- `bun run dev`
  Vite dev server, usually paired with `apps/api`
- `bun run dev:web:solo`
  in-process RPC using local SQLite
- `bun run dev:web:cf`
  local Pages with Wrangler bindings plus local `AUTH_HASHER` and `OG_WORKER` service sessions. The checked-in config routes in-process `/rpc` and `/api` to Hyperdrive/Postgres through `ORPC_DB_DRIVER=hyperdrive`, while D1 remains bound for Better Auth. The script applies D1 migrations and, when Hyperdrive is active, applies local Postgres migrations from the configured `localConnectionString`.

Advanced reference mode:

- `bun run dev:web:cf:services`
  capability example setup with `EDGE_GUARD`, `POST_EVENTS`, and `OG_WORKER`
  on `localhost`, it temporarily pins `ORPC_DB_DRIVER=d1`, auth hashing falls back only if Wrangler cannot proxy the local `AUTH_HASHER` session, `post_activity` is projected inline to keep the example visible, and `/og.png` prefers `OG_WORKER_BASE_URL` before the `OG_WORKER` service binding

Cloudflare-first bindings:

- required: `DB`, `AUTH_HASHER`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- API database driver: `ORPC_DB_DRIVER`, `HYPERDRIVE`
- optional: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- advanced capability bindings: `EDGE_GUARD`, `POST_EVENTS`, `OG_WORKER`
- legacy reference bindings: `ORPC_DEFAULT`, `ORPC_<ROUTER>`

Secret handling:

- keep `BETTER_AUTH_SECRET` in `.dev.vars` for local Pages development
- set `BETTER_AUTH_SECRET` in Cloudflare with `wrangler pages secret put`
- do not check secrets into `wrangler.jsonc`

Binding type generation:

- `bun run --cwd apps/web types:cf`
- rerun it after changing `wrangler.jsonc`

The app intentionally keeps some extension bindings typed or locally bound but unused by default:

- `KV`
- `APP_STATE`
- `R2`

Useful checks:

- `bun run --cwd apps/web check`
- `bun run --cwd apps/web test:e2e`
- `bun run --cwd apps/web test:e2e:solo`

Artifact policy:

- do not commit `test-results/`
- do not commit `.wrangler/state`
- do not commit temp SQLite files
- keep `src/cloudflare-env.d.ts` in sync with `bun run --cwd apps/web types:cf`

Advanced config note:

- `wrangler.jsonc`
  single Pages config source for D1, Hyperdrive, Queue, and service bindings
- `dev:web:cf:services`
  starts the capability example Workers and uses `wrangler.jsonc` as the Pages config source
