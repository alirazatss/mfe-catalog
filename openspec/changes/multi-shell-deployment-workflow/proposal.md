# Multi-Shell Deployment Workflow

## Why

The deployment pipeline is hardwired to a single shell (`website`): the deploy workflow, blob storage layout, Turborepo config-generation outputs, validation scripts, and E2E config all hardcode the shell's name and path. Adding a second shell (e.g., `ccis`) today would require copy-pasting ~200 lines of workflow YAML and duplicating tooling logic, with no guarantee the copies stay in sync. This change parameterizes the pipeline so a new shell costs a thin caller workflow plus config, not a fork of the infrastructure.

## What Changes

- Extract a reusable `workflow_call` deployment workflow (`deploy-shell.yml`) parameterized by shell name, shell path, tag prefix, and blob destination prefix. Convert `deploy-website.yml` into a thin caller that defines only triggers and inputs.
- **BREAKING**: Shell artifacts move from the `dev-shell` container root to per-shell path prefixes (`dev-shell/<shell-name>/`, `dev-shell/<shell-name>/sha-<short-sha>/`, `dev-shell/<shell-name>/pr-<n>/`). Prod shell artifacts in `$web` move under `$web/<shell-name>/`. Existing dev-shell root URLs for `website` change once.
- PR preview deploy and cleanup workflows become multi-shell aware: change detection covers all `apps/shells/*`, preview shells upload to `dev-shell/<shell-name>/pr-<n>/`, and cleanup deletes per-shell preview prefixes.
- De-hardcode shell tooling: Turborepo `generate:config` outputs, `check-shell-size`, `generate-config`, `assert-package-test-scripts`, and related scripts accept a shell parameter or iterate `apps/shells/*`; Playwright E2E shell directory becomes configurable via environment variable.
- Keep the `<shell-name>-v<semver>` git tag convention for prod releases (e.g., `website-v1.2.0`, `ccis-v0.1.0`); the reusable workflow validates the tag version against the shell's `package.json`.

Out of scope: scaffolding the CCIS shell application itself (separate change); MFE deployment pipeline (already multi-target); changes to storage account, containers, RBAC, or CORS provisioning.

## Capabilities

### New Capabilities

- `reusable-shell-deploy-workflow`: A single `workflow_call` GitHub Actions workflow encapsulating version validation, build, dev deploy (floating + immutable SHA paths + build metadata), prod deploy, and concurrency control for any shell, invoked by thin per-shell caller workflows.
- `multi-shell-tooling`: Shell-agnostic monorepo tooling — config generation, size checks, script assertions, and E2E configuration operate on any shell under `apps/shells/*` instead of hardcoding `website`.

### Modified Capabilities

- `shell-deployment-pipeline`: Dev deploy destination changes from `dev-shell` container root to `dev-shell/<shell-name>/`; SHA and metadata paths gain the shell prefix; concurrency groups are keyed per shell.
- `azure-blob-storage-layout`: The shell path families gain a `<shell-name>/` prefix level in `dev-shell` and `$web`; lifecycle policy prefix matching accounts for the nested `pr-` and `sha-` prefixes.
- `pr-preview-deployments`: Preview shell uploads, sticky-comment URLs, and cleanup target `dev-shell/<shell-name>/pr-<n>/`; shell change detection covers every shell in `apps/shells/*`.

## Impact

- `.github/workflows/deploy-website.yml` (becomes caller), new `.github/workflows/deploy-shell.yml` (reusable), `deploy-previews.yml`, `cleanup-previews.yml`.
- `turbo.json` (`generate:config` outputs), `scripts/check-shell-size.ts`, `scripts/generate-config.ts`, `scripts/assert-package-test-scripts.ts`, `scripts/test-integration.ts`, `scripts/validate-app-config.ts`, `tests/e2e/playwright.config.ts`.
- Azure Storage lifecycle policy rules for `dev-shell` prefixes (runbook update; no container/RBAC changes).
- One-time URL migration for consumers of `https://tssmfestorage.blob.core.windows.net/dev-shell/...` → `.../dev-shell/website/...` (docs, bookmarks, any hardcoded references).
