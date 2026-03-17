# Contributing

Thanks for working on the Cloudflare First Starter.

## Ground Rules

- Keep the starter Cloudflare-first. Do not add fake multi-cloud abstraction unless it reduces real complexity.
- Preserve the contract-first layering:
  - `packages/shared`
  - `packages/api`
  - `packages/gateway`
  - runtime apps
- Prefer changes that improve the first-run experience for template users.
- Keep documentation English by default. If you add a Korean translation, use the `_ko` suffix such as `README_ko.md`.

## Local Workflow

```bash
bun install
bun run check
bun test packages/gateway/src/resolver.test.ts packages/shared/test/auth-bridge.test.ts apps/web/src/lib/server/auth-social.test.ts apps/web/src/lib/server/auth-password-hasher.test.ts
```

Run web e2e before merging changes that affect auth, gateway routing, or the starter flows:

```bash
bun run test:e2e
```

## Schema And Contract Changes

When a domain changes, update the stack in this order:

1. `packages/db`
2. `packages/shared`
3. `packages/api`
4. `packages/gateway` if routing changes
5. runtime apps and docs

Generate new migrations and OpenAPI output when applicable:

```bash
bun run --cwd packages/db db:generate
bun run gen:openapi
```

## Pull Requests

- describe user-facing impact
- call out Cloudflare binding or migration changes
- mention docs updates
- mention any skipped verification
