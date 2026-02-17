
- 2026-02-17: Resolver accepts a loose `PlatformLike` (`{ env?: Record<string, unknown> } | null`) instead of SvelteKit `RequestEvent['platform']` to reduce framework coupling.
- 2026-02-17: Resolver allows optional injected `nodeEnv` for deterministic tests while defaulting to `globalThis.process?.env` in runtime.
- 2026-02-17: Handler factory accepts `isDev` in options and threads it into local-handler setup so package consumers control runtime mode without `import.meta.env.DEV` coupling.
