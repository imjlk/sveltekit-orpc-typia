# Bun + SvelteKit + oRPC Monorepo Template Plan

## TL;DR

> **Quick Summary**: A high-performance, full-stack monorepo template using Bun workspaces. Features a strictly typed contract-first architecture with `packages/shared` as the Single Source of Truth (SSOT).
>
> **Deliverables**:
> - **Monorepo Structure**: `apps/api`, `apps/web`, `packages/shared`, `packages/db`.
> - **Shared Library**: Typia-powered validation, Standard Schema integration, and oRPC contracts.
> - **Backend**: Bun-native oRPC server with Drizzle ORM.
> - **Frontend**: SvelteKit (Cloudflare Pages) with TanStack Form and type-safe oRPC client.
> - **CI/CD Ready**: Build scripts and test configurations.
>
> **Estimated Effort**: Medium (Significant configuration and wiring).
> **Parallel Execution**: YES - 3 waves.
> **Critical Path**: Database Schema → Shared Contract/Schema → API & Web Implementation.

---

## Context

### Architecture Overview
- **Runtime & Manager**: Bun (v1.x)
- **Repo Tool**: Bun Workspaces
- **Database**: Drizzle ORM (SQLite for dev, D1/LibSQL ready)
- **Validation**: Typia (AOT compilation) wrapped in Standard Schema
- **RPC**: oRPC (Contract-first)
- **Frontend**: SvelteKit + TanStack Form

### Key Decisions
1.  **Shared Package Build Strategy**: `packages/shared` will be built using `tsup` (via `esbuild`) configured with `unplugin-typia`. This ensures Typia's AST transformations are applied during the build, producing valid JS/DTS for consumers (`api`, `web`).
2.  **Frontend Config**: `apps/web` will use `unplugin-typia/vite` to support any direct Typia usage.
3.  **Deployment Target**: `apps/web` configured with `@sveltejs/adapter-cloudflare`.
3.  **Error Handling**: Unified `ORPCError` usage across the stack.

---

## Work Objectives

### Core Objective
Create a reusable, production-ready monorepo template implementing the specific "SvelteKit + oRPC + TanStack Form" architecture.

### Concrete Deliverables
- [ ] `package.json` with Bun workspaces configuration.
- [ ] `packages/db`: Drizzle setup with migration scripts.
- [ ] `packages/shared`: Build pipeline for Typia, export of schemas/contracts.
- [ ] `apps/api`: oRPC server implementation of the contract.
- [ ] `apps/web`: SvelteKit app with TanStack Form integration.
- [ ] E2E Proof: A working "Post" or "Hello" module flowing from DB to UI.

### Must Have
- **Typia Transformation**: Automated build step in `shared`.
- **Type Safety**: End-to-end type propagation (DB -> API -> Client -> Form).
- **Standard Schema**: Proper wrapping of Typia validators for TanStack Form.

### Must NOT Have
- Complex business logic (keep it to a template/example).
- Node.js dependencies (stick to Bun where possible).

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All tasks must be verified by automated scripts/commands.

### Test Strategy
- **Unit**: Vitest for `packages/shared` (validating schema rules).
- **Integration**: oRPC `createCaller` tests in `apps/api`.
- **E2E**: Playwright tests in `apps/web` (mocked or full stack).

### Agent-Executed QA Scenarios
- **Shared**: Build the package, inspect output for Typia validation code (ensure it's not just types).
- **API**: `curl` or `bun test` against the running server.
- **Web**: Playwright verification of form submission and error handling.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
├── Task 1: Monorepo Setup (Root configs)
└── Task 2: Database Package (Schema & Drizzle)

Wave 2 (The Core - SSOT):
├── Task 3: Shared Package Setup (Typia + Standard Schema + Contract)
└── Task 4: Shared Build Pipeline (ts-patch/tspc)

Wave 3 (Implementation):
├── Task 5: API Server (oRPC Implementation)
├── Task 6: Frontend (SvelteKit + TanStack Form)

Wave 4 (Integration):
└── Task 7: E2E Verification & Polish
```

---

## TODOs

### Wave 1: Foundation

- [x] 1. **Initialize Bun Monorepo**
  **What to do**:
  - Create root `package.json` with `workspaces: ["apps/*", "packages/*"]`.
  - Create `bun.lockb` (via `bun install`).
  - Create `tsconfig.base.json` for shared compiler options.
  - Create `.gitignore`.
  
  **Verification**:
  - `bun install` succeeds.
  - `ls apps packages` exists.

- [x] 2. **Setup Database Package (`packages/db`)**
  **What to do**:
  - Initialize `packages/db`.
  - Install `drizzle-orm`, `drizzle-kit`, `better-sqlite3` (dev).
  - Create `src/schema.ts` with a sample table (e.g., `posts`).
  - Create `drizzle.config.ts`.
  - Add `db:push` and `db:studio` scripts.
  
  **Verification**:
  - `cd packages/db && bun run db:push` creates a local sqlite file.
  - `bun run db:studio` starts (check via curl/timeout).

### Wave 2: The Core (SSOT)

- [x] 3. **Setup Shared Package (`packages/shared`) Structure**
  **What to do**:
  - Initialize `packages/shared`.
  - Install `typia`, `@standard-schema/spec`, `orpc`.
  - Create module structure: `src/modules/post/{types.ts, schema.ts, contract.ts, errors.ts}`.
  - Implement a sample `Post` schema using Typia tags.
  - Implement a `StandardSchema` wrapper for the Typia validator.
  - Define an oRPC contract for `post.create` and `post.list`.
  
  **Verification**:
  - Files exist.
  - Types reference Drizzle types (can import from `packages/db` or redefine as DTOs).

- [x] 4. **Configure Shared Build Pipeline (unplugin-typia)**
  **What to do**:
  - Install `tsup`, `unplugin-typia`.
  - Configure `tsup.config.ts`:
    - Entry: `src/index.ts` (and modules).
    - Format: `esm`.
    - Plugins: `[UnpluginTypia({ /* options */ })]`.
  - Add build script: `tsup`.
  - Ensure `package.json` exports point to `dist/`.
  
  **Verification**:
  - Run `bun run build` in `packages/shared`.
  - Inspect `dist/modules/post/schema.js`. It should contain *actual validation code* (if/else checks), not just empty functions. **Crucial Step**.

### Wave 3: Implementation

- [x] 5. **Implement API Server (`apps/api`)**
  **What to do**:
  - Initialize `apps/api`.
  - Install `@orpc/server`, `hono` (or native bun), and workspace dependencies (`shared`, `db`).
  - Implement the contract: `src/router.ts`.
  - Connect to DB: Import schema from `packages/db`.
  - Add CORS middleware.
  - Create `src/index.ts` entrypoint.
  
  **Verification**:
  - Start server.
  - `curl` the endpoint (e.g., via oRPC JSON-RPC format or simple fetch if enabled).
  - Verify database insert works.

- [x] 6. **Setup Frontend (`apps/web`)**
  **What to do**:
  - Create SvelteKit app: `bun create svelte@latest apps/web`.
  - Install `@sveltejs/adapter-cloudflare`.
  - Install `@tanstack/svelte-form`, `@orpc/client`, workspace `shared`.
  - Install `unplugin-typia`.
  - Configure `vite.config.ts`: Add `UnpluginTypia()` to plugins.
  - Create `lib/client.ts`: Setup typesafe oRPC client.
  - Create a page `routes/posts/+page.svelte` + `+page.server.ts`.
  - Use `createPostSchema` from `shared` in TanStack Form.
  
  **Verification**:
  - `bun run dev` starts.
  - Page loads without errors.

### Wave 4: Integration

- [x] 7. **End-to-End Verification**
  **What to do**:
  - Create a Playwright test in `apps/web`.
  - Scenario: User fills form -> Submits -> Data appears in list.
  - Verify error handling: Submit invalid data -> Typia validation triggers -> UI shows error.
  
  **Verification**:
  - `bun run test:e2e` passes.

---

## Success Criteria
- [x] Monorepo installs cleanly with `bun install`.
- [x] `packages/shared` builds with Typia validation logic embedded.
- [x] API server handles requests using the shared contract.
- [x] Frontend form validates using the shared schema (client-side & server-side).
- [x] Error messages propagate from Shared -> API -> Frontend UI.
