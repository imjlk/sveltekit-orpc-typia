
- 2026-02-17: `lsp_diagnostics` for TypeScript cannot run in this environment because `typescript-language-server` is not installed.
- 2026-02-17: Post-change diagnostics for `packages/gateway/src/handler.ts` are blocked for the same missing `typescript-language-server`; build verification was used as fallback.

- 2026-02-17: E2E verification with `bun run dev:web:solo` failed for `POST /rpc/post/list` (`HTTP 502`, body `Bad Gateway`) due to in-process import failure: `Cannot find module '@repo/db/bun' imported from packages/gateway/src/handler.ts`.

- 2026-02-17: After replacing variable-based dynamic imports with string literals in `packages/gateway/src/handler.ts`, `bun run dev:web:solo` still returns `HTTP 502` for `POST /rpc/post/list`; Vite SSR reports `Cannot find module '@repo/db/bun' imported from '/Users/imjlk/repos/imjlk/sveltekit-orpc-typia/packages/gateway/src/handler.ts'`.

- 2026-02-17: `bun run --cwd apps/web build` now fails at Rollup resolution for `@repo/db/d1` dynamic import in `packages/gateway/src/handler.ts` (`Rollup failed to resolve import "@repo/db/d1"`).
- 2026-02-17: LSP diagnostics tooling remains unavailable for TypeScript files in this environment because `typescript-language-server` is not installed.

- 2026-02-17: `lsp_diagnostics` for `apps/web/vite.config.ts` could not be run cleanly because `typescript-language-server` is not installed; runtime (`dev:web:solo`) and production build verification were used as fallback checks.
