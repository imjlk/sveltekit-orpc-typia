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
  local Pages plus D1

Advanced reference mode:

- `bun run dev:web:cf:services`
  capability example setup with `EDGE_GUARD`, `POST_EVENTS`, and `OG_WORKER`
  on `localhost`, auth hashing falls back only if Wrangler cannot proxy the local `AUTH_HASHER` session, `post_activity` is projected inline to keep the example visible, and `/og.png` prefers `OG_WORKER_BASE_URL` before the `OG_WORKER` service binding

Cloudflare-first bindings:

- required: `DB`, `AUTH_HASHER`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- optional: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- advanced capability bindings: `EDGE_GUARD`, `POST_EVENTS`, `OG_WORKER`
- legacy reference bindings: `ORPC_DEFAULT`, `ORPC_<ROUTER>`

Secret handling:

- keep `BETTER_AUTH_SECRET` in `.dev.vars` for local Pages development
- set `BETTER_AUTH_SECRET` in Cloudflare with `wrangler pages secret put`
- do not check secrets into `wrangler.toml`

Binding type generation:

- `bun run --cwd apps/web types:cf`
- rerun it after changing `wrangler.toml` or `wrangler.services.toml`

The app intentionally keeps extension bindings typed but unused by default:

- `KV`
- `APP_STATE`
- `HYPERDRIVE`
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

- `wrangler.toml`
  default Pages + D1 path
- `wrangler.services.toml`
  capability example path used by `dev:web:cf:services`
