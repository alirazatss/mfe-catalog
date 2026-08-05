# Dev Preview Deployments and Immutable Dev Artifacts

## Why

The current dev deployment policy (ADR-0009 A3) publishes every MFE and the shell to a single floating pointer per target (`mfes-dev/<mfe>/dev/`, `dev-shell/` root) that is overwritten on every push to `main`. This causes last-write-wins races when multiple people merge close together, makes it impossible to reproduce the exact build someone tested, and forces all pre-merge verification onto localhost. There is no isolation for in-review work and no machine-readable record of what is deployed.

## What Changes

- Dev deploys (push to `main`) additionally publish an **immutable commit-SHA artifact** (`sha-<short-sha>/` path) alongside the existing floating `dev` pointer, for both MFEs and the shell.
- Same-repo pull requests get **isolated preview deployments** for changed MFEs (`mfes-dev/<mfe>/pr-<number>/`) and the shell (`dev-shell/pr-<number>/`). Fork PRs never receive deploy credentials.
- The preview shell serves an **auto-generated per-PR remote config** pointing at this PR's MFE previews, falling back to the shared dev pointers for untouched MFEs.
- Every dev and preview deploy uploads a **build metadata file** (`build-info.json`: commit SHA, workflow run id, timestamp) alongside the artifacts.
- Preview artifacts are **cleaned up on PR close** by a dedicated workflow, with an Azure lifecycle TTL policy as a safety net for missed cleanups.
- All dev/preview deploy jobs gain **concurrency groups** keyed by artifact + target so deploys to the same path serialize instead of racing.
- **BREAKING (CI only)**: `deploy-mfes.yml` (git-diff detection) is removed; `deploy-mfes-turbo.yml` (Turborepo dependency-aware detection) becomes the single canonical MFE deploy workflow and absorbs the prod tag flow.

## Capabilities

### New Capabilities

- `pr-preview-deployments`: PR-scoped preview deploys for MFEs and the shell, per-PR shell remote config generation, same-repo-only credential boundary, PR-close cleanup, and TTL safety net.

### Modified Capabilities

- `mfe-deployment-pipeline`: dev deploy also publishes an immutable `sha-<short-sha>/` path and `build-info.json`; deploy jobs serialize via concurrency groups; the unified workflow's change detection moves from git-diff to Turborepo graph and the legacy workflow is removed.
- `shell-deployment-pipeline`: dev shell deploy also publishes an immutable `sha-<short-sha>/` path and `build-info.json`; dev deploy jobs serialize via concurrency group.
- `azure-blob-storage-layout`: dev containers gain `sha-*` (immutable) and `pr-*` (preview, TTL-managed) path families; lifecycle policy covers preview and SHA artifact expiry.

## Impact

- `.github/workflows/deploy-mfes-turbo.yml` (extended: SHA paths, previews, metadata, concurrency, prod tag flow)
- `.github/workflows/deploy-mfes.yml` (deleted)
- `.github/workflows/deploy-website.yml` (extended: SHA paths, preview shell, metadata)
- New `.github/workflows/cleanup-previews.yml` (PR close)
- Azure: lifecycle management policy on `tssmfestorage` for `pr-*`/`sha-*` prefixes (runbook update in `docs/runbooks/azure-blob-provisioning.md`)
- `docs/adr/` — new ADR extending ADR-0009 A3 with the immutable-dev/preview policy
- No prod pipeline behavior changes; no application code changes required (preview shell config is generated at deploy time)
