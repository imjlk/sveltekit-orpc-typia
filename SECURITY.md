# Security Policy

## Reporting Vulnerabilities

Please do not open a public issue for suspected vulnerabilities.

Use GitHub's private vulnerability reporting or security advisory flow when it is enabled for this repository. If that is not available, contact the repository maintainer through the contact channel listed on the GitHub repository profile.

Include enough detail to reproduce the issue:

- affected package or app
- affected route, Worker, binding, or script
- expected and actual behavior
- reproduction steps
- any relevant logs with secrets removed

## Secrets And Local State

Do not commit real secrets, local Cloudflare state, local databases, or generated test output.

Use `.dev.vars` for local-only values and Cloudflare dashboard or Wrangler secret commands for deployed secrets. Example files may include placeholder values, but production credentials must stay outside the repository.

## Supported Surface

The default supported runtime surface is:

- SvelteKit on Cloudflare Pages
- `/auth/*` through Better Auth
- `/rpc/*` and `/api/*` through the gateway
- D1 as the default database path
- optional Hyperdrive/Postgres for the in-process API gateway
- optional Cloudflare Workers for `AUTH_HASHER`, `OG_WORKER`, and advanced examples

Report security issues against the checked-in template and documented deployment paths. Downstream application-specific changes are the responsibility of the downstream project owner.
