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
