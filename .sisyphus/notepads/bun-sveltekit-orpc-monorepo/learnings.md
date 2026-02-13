- Initialized Bun monorepo with `workspaces` in root `package.json`.
- Created `tsconfig.base.json` for shared TypeScript configuration.
- Root `tsconfig.json` now extends `tsconfig.base.json`.
- `.gitignore` updated to include `.svelte-kit` and `build` directories.
- `packages/db` was already present and is now part of the workspace.
### Database Setup
- Used `drizzle-orm` with `better-sqlite3` as requested.
- Configuration in `drizzle.config.ts` points to `sqlite.db`.
- Package name is `@repo/db`.
- Exported schema and a `createDb` helper from `src/index.ts`.
### Frontend Setup
- Successfully integrated `@tanstack/svelte-form` with `@repo/shared` schemas.
- Configured `vite.config.ts` with `UnpluginTypia` for strict typing.
- Implemented `createForm` with schema validation for form handling.
- Integrated `createORPCClient` for type-safe API calls.
- Encountered type mismatch with `ContractRouterClient` and `PostContract` in `client.ts`. Used a workaround by casting to `AppClient` interface.
- Verified setup with `svelte-check`.
