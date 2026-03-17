# packages/auth-hasher-better-auth-adapter

Better Auth-oriented glue for the internal `AUTH_HASHER` service binding.

This package keeps Worker binding lookup and optional fallback behavior out of `apps/web`, so the
web app only needs to provide runtime-specific fallback policy.
