
- 2026-02-17: `resolveUpstream` priority remains `per-router binding > per-router URL > default binding > default URL > local > hardcoded fallback`.
- 2026-02-17: Keep URL normalization shared in utility to preserve `/rpc` to `/api` remapping behavior for API gateway mode.
- 2026-02-17: Gateway handler forwarding keeps parity with `apps/web` by removing `host`, preserving query string, and only streaming a request body for non-GET/HEAD methods.
## Integration of @repo/gateway into apps/web

- Successfully moved gateway logic to a dedicated workspace package.
- Verified that SvelteKit builds correctly using the shared handler factory.
- Verified that `import.meta.env.DEV` is correctly passed for dev-mode features like Scalar UI redirects.

- 2026-02-17: Converting dynamic imports to string literals in `packages/gateway/src/handler.ts` removes variable indirection, but `dev:web:solo` still depends on SSR resolving `@repo/db/bun` from the `@repo/gateway` package context.

- 2026-02-17: Adding explicit `resolve.alias` entries in `apps/web/vite.config.ts` for `@repo/db/bun`, `@repo/db/d1`, and `@repo/db/migrations` allows Vite SSR to resolve db runtime adapters when consumed through `@repo/gateway` in `dev:web:solo`.
