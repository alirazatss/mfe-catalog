# Design: Multi-Shell Deployment Workflow

## Context

The repo has one shell (`apps/shells/website`) deployed by a ~200-line shell-specific workflow (`.github/workflows/deploy-website.yml`): tag validation against `package.json`, `pnpm --filter "website..." build`, dev upload to the `dev-shell` container root plus an immutable `sha-<short8>/` path, and a config-only prod redeploy to `$web`. Preview (`deploy-previews.yml`) and cleanup (`cleanup-previews.yml`) workflows hardcode the same shell paths. Tooling is equally coupled: `turbo.json` declares `apps/shells/website/public/remotes.config.json` as the `generate:config` output, and several scripts plus the Playwright config hardcode `website`. A second shell (`ccis`) is planned.

## Goals / Non-Goals

**Goals:**

- One reusable deployment workflow; adding a shell costs a ~20-line caller workflow.
- Uniform blob layout: every shell lives under its own prefix in `dev-shell` and `$web`.
- Preview/cleanup workflows and monorepo tooling work for any shell in `apps/shells/*`.
- Preserve existing guarantees: immutable SHA paths, build metadata, per-shell serialized dev deploys, tag/version validation, fork-PR credential isolation.

**Non-Goals:**

- Scaffolding the CCIS shell application (separate change).
- Changes to MFE deployment (`mfes-dev`/`mfes-prod` layout is already per-target).
- New containers, storage accounts, RBAC roles, or CORS rules.
- Custom-domain/CDN routing between shells (future concern once shell #2 ships).

## Decisions

### D1: Reusable `workflow_call` workflow + thin callers (vs. matrix in one workflow, vs. copy-per-shell)

A single `.github/workflows/deploy-shell.yml` with `on: workflow_call` receives inputs; each shell gets a caller declaring only triggers and inputs.

- _Copy-per-shell_ rejected: divergence risk is exactly the problem being solved.
- _Single workflow with a shell matrix_ rejected: GitHub triggers (path filters, tag patterns) are workflow-level, so one workflow cannot cleanly scope `push` paths and `tags` per shell; callers give free per-shell trigger scoping and per-shell run visibility in the Actions UI.

Inputs: `shell-name` (blob prefix + concurrency key), `shell-path`, `package-name` (pnpm filter), `tag-prefix`. Secrets/vars (AZURE_CLIENT_ID_DEV, tenant, subscription) are inherited via `secrets: inherit` / repo `vars`, keeping callers minimal.

### D2: Path prefix per shell inside existing containers (vs. container per shell)

`dev-shell/<shell-name>/...` and `$web/<shell-name>/...` rather than `dev-shell-ccis`, `$web-ccis`, etc.

- Container-per-shell would require new RBAC scope assignments, CORS entries, lifecycle-policy rules, and provisioning runbook changes for every shell; prefixes need none of that.
- `$web` is special (static website hosting) — there can only be one, so prod must be prefix-based anyway; dev mirrors prod for symmetry.
- Trade-off: lifecycle policy prefix matching must handle nested `pr-`/`sha-` segments (rule prefixes become `dev-shell/` + per-shell wildcards are not supported, so rules are written per known shell or use `daysAfterModificationGreaterThan` with prefix `dev-shell/` scoped by blob-index tags if needed; simplest is one rule pair per shell, updated when a shell is added — acceptable given shells are added rarely).

### D3: Migrate `website` to its prefix now, before shell #2 (vs. grandfathering root)

One-time breaking move of the dev shell from container root to `dev-shell/website/` (and prod from `$web` root to `$web/website/`). Doing it while only one shell and few URL consumers exist minimizes blast radius; grandfathering would leave a permanent asymmetry every workflow, script, and doc must special-case. Migration = deploy-to-new-prefix first, keep root serving during a grace period, then delete root blobs.

### D4: Tooling parameterization strategy

- `turbo.json`: `generate:config` outputs become the glob `apps/shells/*/public/remotes.config.json` (globs are supported in task outputs); each shell's `prebuild` invokes generation for itself.
- Scripts take an optional `--shell <name>` / positional arg and default to iterating `apps/shells/*` — CI stays a single invocation, local use stays targeted.
- Playwright: resolve shell dir from `E2E_SHELL_DIR` with the current website path as default — zero behavior change until a second shell needs the suite.

### D5: Keep `<shell-name>-v<semver>` tags

Already established for `website-v*`; the reusable workflow derives the expected prefix from the `tag-prefix` input and validates `<semver>` against `<shell-path>/package.json`. No new release tooling.

## Risks / Trade-offs

- [Breaking URL change for dev shell root consumers] → Grace period during which root and prefix both serve the same build; announce the new URL; delete root only after the grace period. `build-info.json` at both locations makes staleness detectable.
- [Lifecycle policy misses nested prefixes after migration] → Update the policy in the same change wave as the migration; verify with a listed-blob audit before deleting root artifacts (runbook step).
- [`workflow_call` + `pull_request` path filter drift between callers] → Caller template documented in the runbook; caller review checklist includes "triggers match shell-path input".
- [Preview shell detection across `apps/shells/*` adds matrix complexity to deploy-previews.yml] → Reuse the existing Turborepo `--filter='[origin/main...HEAD]'` detection, extended to `apps/shells/` directories, mirroring the proven MFE matrix pattern.
- [Turbo output glob mis-declaration breaks caching] → Covered by scenario tests in `multi-shell-tooling`; verify with `turbo build --dry-run=json`.

## Migration Plan

1. **Wave 1 (pure refactor, no URL change):** Extract `deploy-shell.yml`; convert `deploy-website.yml` to a caller still targeting the container root. Verify a dev deploy is byte-identical.
2. **Wave 2 (breaking):** Switch destination inputs to `dev-shell/website/` and `$web/website/`; dual-publish (root + prefix) during grace period; update lifecycle policy and preview/cleanup workflows to prefixed paths; announce new URLs.
3. **Wave 3:** De-hardcode turbo/scripts/Playwright.
4. **Wave 4:** Delete root blobs after grace period; update docs/runbooks.

Rollback: Wave 1 reverts to the previous workflow file (git revert). Wave 2 rollback = repoint destination inputs back to root (root artifacts still present during grace period).

## Open Questions

- Grace-period length for dual-publish before root deletion (suggest 2 weeks, aligned with the 14-day `pr-` lifecycle rule).
- Whether prod `$web` currently serves a build at root that external consumers reference (needs a blob audit before Wave 2).
