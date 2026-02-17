# Plan: Gateway Refactor

## TL;DR

> **Quick Summary**: Extract the complex routing and upstream resolution logic from `apps/web` into a reusable `@repo/gateway` package.
> 
> **Deliverables**:
> - New package: `packages/gateway`
> - Updated `apps/web` using the new package
> - Clean separation of concerns (Routing logic vs App logic)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Scaffold Package → Migrate Logic → Integrate Web

---

## Context

### Original Request
Refactor the "Fat Gateway" logic in `apps/web/src/lib/server/orpc-gateway.ts` into a shared package.

### Interview Summary
**Key Discussions**:
- **User Choice**: Prioritized "Gateway Refactor" over other improvements.
- **Why**: High architectural value, enables reuse, improves testability.

**Research Findings**:
- **Current Logic**: Handles complex upstream resolution (Binding > URL > Default > In-process).
- **Dependencies**: Relies on `@repo/api`, `@repo/db`, `@sveltejs/kit` types.
- **Environment**: Heavily dependent on `import.meta.env` and `platform.env`.

### Metis Review
**Identified Gaps** (addressed):
- **SvelteKit Coupling**: The logic uses `RequestEvent` types. Solution: Keep types but decouple from global `import.meta.env`.
- **In-Process Mode**: Needs dynamic imports of `@repo/api` to work correctly. Solution: Preserve this behavior in the new package.

---

## Work Objectives

### Core Objective
Decouple routing logic from the frontend application to enable future scalability (e.g., CLI, mobile app, or multiple frontends).

### Concrete Deliverables
- `packages/gateway/package.json`
- `packages/gateway/src/index.ts` (and helper files)
- Updated `apps/web/src/lib/server/orpc-gateway.ts` (deleted or re-exported)
- Updated `apps/web/src/routes/rpc/[...path]/+server.ts`

### Definition of Done
- [ ] `bun run build` passes for both `apps/web` and `packages/gateway`
- [ ] `bun run dev:web` works with both local (in-process) and remote (simulated) modes
- [ ] Logic is importable from `@repo/gateway`

### Must Have
- **Type Safety**: Gateway options must be typed.
- **Backward Compatibility**: `apps/web` must function exactly as before.

### Must NOT Have (Guardrails)
- **Hardcoded Secrets**: No API keys or secrets in the package code.
- **Framework Lock-in**: Logic should be adaptable to non-SvelteKit consumers if possible (though SvelteKit types are acceptable for now).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Bun test)
- **Automated tests**: YES (TDD for logic extraction)
- **Framework**: `bun test`

### QA Policy
Every task MUST include agent-executed QA scenarios.

| Deliverable Type | Verification Tool | Method |
|------------------|-------------------|--------|
| Library/Module | Bash (bun test) | Unit test the resolution logic |
| Frontend/Web | Playwright/Curl | Verify the API endpoints still respond |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Scaffolding & Logic Extraction):
├── Task 1: Create @repo/gateway package [quick]
├── Task 2: Implement upstream resolver logic [deep]
└── Task 3: Implement handler factory [deep]

Wave 2 (Integration & Cleanup):
├── Task 4: Integrate @repo/gateway into apps/web [unspecified-high]
└── Task 5: Verify E2E functionality [deep]

Critical Path: Task 1 → Task 2 → Task 3 → Task 4 → Task 5
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|------------|--------|------|
| 1 | — | 2, 3 | 1 |
| 2 | 1 | 3 | 1 |
| 3 | 2 | 4 | 1 |
| 4 | 3 | 5 | 2 |
| 5 | 4 | — | 2 |

---

## TODOs

- [x] 1. Create @repo/gateway package

  **What to do**:
  - Create `packages/gateway` directory.
  - Create `package.json` with dependencies (`@repo/api`, `@repo/shared`, `@orpc/server`).
  - Configure `tsconfig.json`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2, Task 3

  **References**:
  - `packages/api/package.json` - Copy dependencies from here
  - `packages/shared/tsconfig.json` - Base config

  **Acceptance Criteria**:
  - [ ] `packages/gateway/package.json` exists and is valid
  - [ ] `bun install` runs successfully

  **QA Scenarios**:
  ```
  Scenario: Package Scaffolding
    Tool: Bash
    Steps:
      1. Run `ls packages/gateway/package.json`
      2. Run `bun install`
    Expected Result: Success output
    Evidence: .sisyphus/evidence/task-1-scaffold.txt
  ```

- [x] 2. Implement upstream resolver logic

  **What to do**:
  - Extract `resolveUpstream` logic from `apps/web`.
  - Move it to `packages/gateway/src/resolver.ts`.
  - Ensure it handles `ORPC_*` env vars correctly (accepting them as arguments).

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Blocks**: Task 3

  **References**:
  - `apps/web/src/lib/server/orpc-gateway.ts` - Source logic

  **Acceptance Criteria**:
  - [ ] `resolveUpstream` function is exported
  - [ ] Unit tests cover Binding vs URL priority

  **QA Scenarios**:
  ```
  Scenario: Resolver Logic Test
    Tool: Bash
    Steps:
      1. Create `packages/gateway/src/resolver.test.ts`
      2. Run `bun test packages/gateway`
    Expected Result: All tests pass
    Evidence: .sisyphus/evidence/task-2-test.txt
  ```

- [ ] 3. Implement handler factory

  **What to do**:
  - Create `packages/gateway/src/handler.ts`.
  - Implement `createGatewayHandler` factory function.
  - Port the `RequestEvent` handling logic.
  - Add logic to dynamic import `@repo/api` when in-process.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs Task 2)
  - **Blocks**: Task 4

  **References**:
  - `apps/web/src/lib/server/orpc-gateway.ts` - Source logic

  **Acceptance Criteria**:
  - [ ] `createGatewayHandler` is exported
  - [ ] Types match SvelteKit's `RequestHandler`

  **QA Scenarios**:
  ```
  Scenario: Handler Factory Build
    Tool: Bash
    Steps:
      1. Run `bun build packages/gateway/src/index.ts`
    Expected Result: Build success
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

- [ ] 4. Integrate @repo/gateway into apps/web

  **What to do**:
  - Add `@repo/gateway` to `apps/web/package.json`.
  - Replace `src/lib/server/orpc-gateway.ts` with re-export or delete it.
  - Update `src/routes/rpc/[...path]/+server.ts` to use new package.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 5

  **References**:
  - `apps/web/src/routes/rpc/[...path]/+server.ts` - Target file

  **Acceptance Criteria**:
  - [ ] `apps/web` builds successfully
  - [ ] `src/lib/server/orpc-gateway.ts` is removed

  **QA Scenarios**:
  ```
  Scenario: Web App Build
    Tool: Bash
    Steps:
      1. Run `bun run build --filter=web`
    Expected Result: Build success
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

- [ ] 5. Verify E2E functionality

  **What to do**:
  - Run the full dev server.
  - Hit the `/rpc` endpoint to ensure it still proxies correctly.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO

  **References**:
  - `apps/web/src/routes/rpc/[...path]/+server.ts` - Logic to test

  **Acceptance Criteria**:
  - [ ] `/rpc/health` (or similar) returns 200 OK
  - [ ] In-process logic works (DB access)

  **QA Scenarios**:
  ```
  Scenario: E2E Verification
    Tool: Bash
    Steps:
      1. Start `bun run dev:web` in background
      2. Run `curl http://localhost:5173/rpc/version` (adjust port/path)
    Expected Result: 200 OK
    Evidence: .sisyphus/evidence/task-5-e2e.txt
  ```

---

## Success Criteria

### Final Checklist
- [ ] `@repo/gateway` exists
- [ ] `apps/web` no longer contains complex gateway logic
- [ ] App still works locally and builds for prod
