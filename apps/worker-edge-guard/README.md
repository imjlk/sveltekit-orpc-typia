# apps/worker-edge-guard

Advanced capability example for cross-cutting edge policy.

This Worker is not part of the default starter topology.

It exposes an internal-only service binding named `EDGE_GUARD` and demonstrates:

- Worker-to-Worker service bindings for policy checks
- Cloudflare Workers Rate Limiting as the default backend
- Durable Objects as an optional stronger-coordination backend

Public method surface:

- `checkPostCreateLimit(input)`
- `getMode()`

Default policy:

- applies only to `post.create`
- key shape: `user:<userId>`
- quota: `5 requests / 60 seconds`

Runtime config lives in `wrangler.toml`.

- `RATE_LIMITER` is required in `ratelimit` mode
- `RATE_LIMITER_STATE` is optional and only used in `do` mode
- `EDGE_GUARD_MODE` defaults to `ratelimit`
