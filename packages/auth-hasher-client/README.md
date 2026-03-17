# packages/auth-hasher-client

Binding helpers and password hash upgrade helpers for callers of the internal `AUTH_HASHER`
service binding.

This package is where application Workers should import:

- binding resolution helpers
- proxy error detection helpers
- `verifyAndMaybeRehash()` and related assessment helpers
