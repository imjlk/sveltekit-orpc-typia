# Public Release Checklist

Use this checklist before making the repository public or marking it as a GitHub template.

## Repository Metadata

- Confirm the repository name, description, topics, and website URL.
- Confirm the license holder in `LICENSE`.
- Enable GitHub vulnerability reporting or document a private security contact.
- Decide whether Issues and Discussions should be enabled for template support.
- Add repository topics such as `cloudflare`, `sveltekit`, `orpc`, `typia`, `bun`, `d1`, and `hyperdrive`.

## Secret And State Audit

- Confirm no real `.env`, `.dev.vars`, `.wrangler/state`, local SQLite, D1 export, or Postgres dump files are tracked.
- Keep only placeholder Cloudflare resource identifiers in checked-in Wrangler config.
- Keep `BETTER_AUTH_SECRET`, social OAuth secrets, and Cloudflare API tokens out of the repository.
- Treat example passwords and local connection strings as local-only documentation, not deployable credentials.

Useful checks:

```bash
git status --short
git ls-files | rg '(^|/)(\.env|\.dev\.vars|\.wrangler|test-results|playwright-report)|\.(db|sqlite|sqlite3)$'
rg -n 'secret|password|token|CHANGE_ME|00000000-0000-0000-0000-000000000000' README.md README_ko.md apps packages scripts .github
```

## Fresh Clone Validation

Run these from a clean checkout:

```bash
bun install --frozen-lockfile
bun run check
bun run verify:openapi
bun run test:unit
bun run test:e2e
bun run --cwd apps/web test:e2e:solo
bun run smoke:web:cf
cargo check --manifest-path apps/auth-hasher-worker/Cargo.toml --target wasm32-unknown-unknown
```

Run the split-service smoke only when reviewing the advanced Worker reference path:

```bash
bun run smoke:web:cf:services
```

## Generated Artifacts

- Regenerate Cloudflare binding types after Wrangler binding changes:

```bash
bun run types:cf
```

- Regenerate OpenAPI output after contract changes:

```bash
bun run gen:openapi
bun run verify:openapi
```

- Regenerate the auth hasher kernel only when Rust sources, hash presets, or the kernel build script change:

```bash
bun run --cwd apps/auth-hasher-worker build:kernel
```

## Documentation Pass

- README explains the default D1-first path and the optional Hyperdrive/Postgres path.
- README links to package-level docs and this checklist.
- `SECURITY.md` explains private vulnerability reporting and secret handling.
- `CONTRIBUTING.md` points contributors to the current validation commands.
- Korean docs use the `_ko` suffix when added.
- Placeholder text is intentional and deploy-time values are clearly marked.

## Publish Steps

1. Create a final public-release branch or tag.
2. Verify the working tree is clean after the validation commands.
3. Push the branch and open a PR.
4. Enable GitHub template repository settings after merge.
5. Re-check the public repository page for accidental private wording, screenshots, or stale setup instructions.
