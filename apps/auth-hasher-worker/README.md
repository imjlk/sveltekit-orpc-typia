# apps/auth-hasher-worker

Internal Cloudflare Worker used by the starter for password hashing in Cloudflare runtime.

Runtime layout:

- `src/index.ts`
  TypeScript Worker shell exposing `WorkerEntrypoint` RPC
- `src/fetch-handler.ts`
  metadata route and runtime env handling
- `src/kernel.ts`
  Wasm loader used by the Worker runtime
- `src/rust-wasm-kernel.wasm`
  checked-in Wasm artifact produced by `bun run build:kernel`
- `src/rust-wasm-kernel.build.json`
  build manifest with artifact checksum for deploy verification
- `crates/hash-core`
  shared Rust hashing logic
- `crates/rust-wasm-kernel`
  raw Wasm kernel imported by the TypeScript shell

Exports through service binding methods only:

- `hashPassword(password): Promise<string>`
- `verifyPassword(hash, password): Promise<boolean>`

`GET /` returns metadata about the active hashing preset.

All other HTTP requests are rejected with `404`.

Build-time env knobs:

- `AUTH_HASHER_PRESET_ID`
- `AUTH_HASHER_ARGON2_MEMORY_KIB`
- `AUTH_HASHER_ARGON2_TIME_COST`
- `AUTH_HASHER_ARGON2_PARALLELISM`
- `AUTH_HASHER_ARGON2_OUTPUT_LENGTH`
- `AUTH_HASHER_ENABLE_METADATA_ROUTE`

Commands:

- `bun run --cwd apps/auth-hasher-worker build:kernel`
- `bun run --cwd apps/auth-hasher-worker dev`
- `bun run --cwd apps/auth-hasher-worker test`
- `bun run --cwd apps/auth-hasher-worker check`
- `bun run --cwd apps/auth-hasher-worker deploy`
