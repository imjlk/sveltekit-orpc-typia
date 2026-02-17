
- 2026-02-17: Resolver accepts a loose `PlatformLike` (`{ env?: Record<string, unknown> } | null`) instead of SvelteKit `RequestEvent['platform']` to reduce framework coupling.
- 2026-02-17: Resolver allows optional injected `nodeEnv` for deterministic tests while defaulting to `globalThis.process?.env` in runtime.
- 2026-02-17: Handler factory accepts `isDev` in options and threads it into local-handler setup so package consumers control runtime mode without `import.meta.env.DEV` coupling.

- 2026-02-17: Keep workspace-resolution fix local to `apps/web/vite.config.ts` via explicit `resolve.alias` for `@repo/db/*` subpath imports instead of changing package export behavior, to unblock Vite SSR without cross-package refactors.
