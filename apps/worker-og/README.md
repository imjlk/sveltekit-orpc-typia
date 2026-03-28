# apps/worker-og

Advanced capability example for optional Open Graph image rendering.

This Worker is not part of the default starter topology.

It exposes HTTP endpoints instead of RPC methods:

- `GET /health`
  readiness probe
- `GET /render.png?...`
  render a PNG OG image from query options

Supported query options:

- `title`
- `subtitle`
- `eyebrow`
- `badge`
- `footer`
- `theme`
  `sunset`, `ocean`, or `graphite`
- `align`
  `left` or `center`

Runtime config lives in `wrangler.toml`.

- `OG_RATE_LIMIT` is optional at runtime but wired as the default rate-limit example binding
- rendered PNGs are cached with the Workers Cache API

## Service binding operating notes

These notes come from debugging a real Pages + Worker deployment and are kept here
as practical guardrails for this starter.

These notes matter most when the web app proxies OG images through a route such as
`/og.png` and calls this Worker via the `OG_WORKER` service binding.

### Baseline assumptions

- treat the web app route as the canonical entrypoint
- let the OG Worker focus on rendering and short-term burst absorption
- preserve upstream PNG/cache headers through the proxy route
- use URL versioning for invalidation instead of relying on zone cache rules

### When DNS proxy and Cache Rules are not helping

In one real deployment, the final stable environment had:

- no Cloudflare Cache Rule for the OG path
- DNS proxy for the main host turned off

In that setup, stability came from:

- `Pages/App route -> service binding -> OG Worker`
- Worker-internal `Cache API`
- versioned OG URLs such as `?rev=...`

Do not assume zone cache purge or edge cache rules will be the main safety net.

### Keep the proxy route thin

If `apps/web/src/routes/og.png/+server.ts` proxies to the worker:

- copy through `content-type`, `cache-control`, `etag`, and any OG debug/cache headers
- buffer the upstream body before returning if stream forwarding causes empty responses
- avoid forcing `no-store` on successful image responses unless you are debugging

Forcing `no-store` at the app proxy can cause every page load to regenerate all OG images
at once, which can produce intermittent `503` bursts.

### Service binding retry behavior

If the OG route is user-facing and many images load in parallel:

- prefer a short retry when the service binding call fails once
- optionally fall back to a direct base URL only as a last resort

This repo already supports a direct URL fallback via `OG_WORKER_BASE_URL` in
`apps/web/src/lib/server/og-worker.ts`. Keep the service binding as the primary path.

### Worker cache guidance

Worker-side cache is useful here, but only if it is disciplined:

- scope it to OG image routes only
- give cache keys a versioned prefix
- enforce a finite TTL

Good examples:

- `og-image-v1-<hash>`
- rotate the prefix when you need a full logical invalidation

This avoids over-reliance on Cloudflare zone purge while still protecting the renderer
from thundering-herd traffic.

### Recommended invalidation strategy

Prefer:

1. versioned OG URLs such as `?rev=2026-03-25-2`
2. versioned Worker cache key prefixes
3. only then, zone purge if your deployment topology actually uses Cloudflare edge cache

### Service worker rule

If the web app has a browser service worker, make sure OG paths are bypassed.

Example rule of thumb:

- bypass `/og.png`
- bypass `/og/`
- do not let browser-side SW caching become part of the OG debugging surface

### What to inspect during incidents

Check these in order:

1. the app route response
2. the direct worker response
3. whether both return `image/png`
4. whether both share the same cache semantics
5. whether failures happen only through the app proxy

Useful diagnostic headers:

- `x-og-source`
- `x-og-cache`
- `x-og-cache-key`
- proxy version headers added by the app route when debugging
