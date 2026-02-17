
- 2026-02-17: `resolveUpstream` priority remains `per-router binding > per-router URL > default binding > default URL > local > hardcoded fallback`.
- 2026-02-17: Keep URL normalization shared in utility to preserve `/rpc` to `/api` remapping behavior for API gateway mode.
- 2026-02-17: Gateway handler forwarding keeps parity with `apps/web` by removing `host`, preserving query string, and only streaming a request body for non-GET/HEAD methods.
