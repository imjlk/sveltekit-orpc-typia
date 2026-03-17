# packages/shared

Shared contract layer for the starter.

This package is the SSOT for:

- oRPC contracts
- typia-backed schemas
- transport-safe DTO mapping
- shared error shapes
- capability types shared between Pages and advanced Workers
- the signed internal auth bridge used between the gateway and API runtimes

When adding or changing a domain, update this package before touching runtime apps.

Typical workflow:

1. define or update the module schema and contract here
2. implement the router in `packages/api`
3. expose the router through `packages/gateway`
4. wire the feature into `apps/web` or another runtime wrapper

Service-bound Workers are an advanced follow-on, not the default template path.

Useful commands:

- `bun run --cwd packages/shared build`
- `bun test packages/shared/test/auth-bridge.test.ts`

Important exports include:

- `contracts/*`
- `modules/*`
- `capabilities`
- `transport/auth-bridge`
- transport helpers for OpenAPI, Scalar, Standard RPC, and typia-backed serialization
