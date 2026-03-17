# apps/worker-post-events

Advanced capability example for async side effects.

This Worker is not part of the default starter topology.

It consumes the `POST_EVENTS` Queue and projects `post.created` messages into the shared D1 database as `post_activity` rows.

The demo app surfaces those rows under `/posts` as a visible async projection.

Message scope in v1 is intentionally small:

- only `post.created`
- only D1 projection
- no external email, webhook, or third-party delivery

Runtime config lives in `wrangler.toml`.

- `DB` points at the same D1 database used by `apps/web`
- Queue consumer binding listens to `cloudflare-first-starter-post-events`
