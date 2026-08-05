# Design: Dev Preview Deployments and Immutable Dev Artifacts

## Context

ADR-0009 established the MVP pipeline: prod artifacts are versioned and immutable (`mfes-prod/<mfe>/v<semver>/`, `$web/v<semver>/`), while dev is a single floating pointer per target (`mfes-dev/<mfe>/dev/`, `dev-shell/` root) overwritten on every push to `main`. Two MFE deploy workflows currently coexist (`deploy-mfes.yml` with git-diff detection, `deploy-mfes-turbo.yml` with Turborepo-graph detection), which double-deploys on the same push. Only the shell workflow has a concurrency group. There is no pre-merge deployment target: verification of in-review work happens on localhost only.

Constraints:

- Single storage account `tssmfestorage` with container-scoped RBAC (`gha-mfe-dev` → `mfes-dev` + `dev-shell` only). Previews live entirely inside the dev containers, so no new Azure identities or role assignments are required.
- OIDC federated credentials exist for `environment:dev` subjects; preview jobs reuse the dev identity.
- Fork PRs must never obtain Azure credentials (OWASP: credential exposure via untrusted code execution).

## Goals / Non-Goals

**Goals**

- Reproducible dev builds: every `main` deploy addressable forever (within TTL) by commit SHA.
- Pre-merge verification: an isolated, shareable preview per same-repo PR for MFEs and shell.
- Deterministic answer to "what is deployed here right now" via `build-info.json`.
- Eliminate last-write-wins races on shared dev pointers.
- One canonical MFE deploy workflow.

**Non-Goals**

- No prod pipeline changes (versioning, tag flow, config-pin PRs unchanged).
- No promotion mechanism from SHA/preview artifacts to prod (prod still builds from tags).
- No CDN, custom domain, or per-environment storage account migration (future per ADR-0009 A7).
- No GitHub environment protection rule configuration (operational task, tracked outside this change).

## Decisions

### D1: SHA paths live beside the pointer in the same container

`mfes-dev/<mfe>/sha-<short8>/` and `dev-shell/sha-<short8>/`, not a new container. Alternatives: a separate `dev-archive` container (rejected: new RBAC scope, new CORS entry, no benefit); full 40-char SHA paths (rejected: 8 chars is unique enough at this scale and keeps URLs readable). Immutability is enforced the same way prod does it: conditional upload (`If-None-Match: *`) — but unlike prod, an already-existing SHA path on a re-run is tolerated (skip, not fail), because re-runs of the same commit are legitimate.

### D2: Previews are PR-number-keyed, not branch-keyed

`pr-<number>/` paths. Alternatives: branch-name keys (rejected: branch names need sanitization for blob paths, and PR number maps 1:1 to the review lifecycle including the close event that drives cleanup).

### D3: Preview workflow is a new file; canonical dev/prod workflow absorbs the rest

- `deploy-mfes-turbo.yml` becomes the single MFE workflow for `main` pushes and prod tags (absorbing the tag flow from legacy `deploy-mfes.yml` before deleting it).
- A new `deploy-previews.yml` (trigger: `pull_request` types `opened`/`synchronize`) owns MFE + shell preview deploys and the sticky comment.
- A new `cleanup-previews.yml` (trigger: `pull_request` type `closed`) owns deletion.

Alternative: extend existing workflows with `pull_request` triggers (rejected: mixes trust boundaries in one file and complicates the same-repo guard review).

The same-repo boundary uses the plain `pull_request` trigger (which gives forks a read-only token and no secrets/OIDC by default) plus an explicit `github.event.pull_request.head.repo.full_name == github.repository` guard on deploy jobs as defense in depth. `pull_request_target` is deliberately not used.

### D4: Preview shell config is generated at deploy time, not committed

The preview workflow reads `remotes.config.dev.json`, rewrites `entryUrl` for MFEs changed in the PR (detected via `turbo build --dry-run=json --filter='[origin/main...HEAD]'`) to their `pr-<n>` URLs, and injects the result as the built shell's `remotes.config.json`. Alternative: runtime query-param override in the shell (rejected: requires shell code changes and weakens the "config is what you tested" guarantee).

### D5: Cleanup is workflow-first with lifecycle TTL as backstop

PR-close workflow deletes `pr-<n>/` prefixes deterministically. Azure lifecycle policy deletes `pr-*` after 14 days and `sha-*` after 30 days since last modification, scoped to `mfes-dev` and `dev-shell` only. TTLs are conventions, tunable in the runbook; they exist to bound storage growth, not to be the primary cleanup path.

### D6: Concurrency policy differs by target type

- Shared pointers (`dev/`, `dev-shell` root): group `deploy-<artifact>-dev`, `cancel-in-progress: false` — every merge must land, in order.
- Previews: group `preview-pr-<number>`, `cancel-in-progress: true` — only the newest push per PR matters.

## Risks / Trade-offs

- [Storage growth from SHA + preview artifacts] → lifecycle TTLs (14/30 days); dev containers only.
- [Cleanup workflow does not fire on force-deleted branches/repos edge cases] → lifecycle TTL backstop.
- [Sticky comment requires `pull-requests: write` permission] → scope permission to the comment job only; deploy jobs keep `id-token: write, contents: read`.
- [Turbo detection base for PRs (`origin/main...HEAD`) differs from main pushes (`HEAD^1`)] → both are spec-covered scenarios; fetch-depth configured accordingly.
- [Deleting deploy-mfes.yml drops its prod tag flow] → deploy-mfes-turbo.yml absorbs the tag trigger and prod job before deletion, in the same task group, verified by a tag dry-run.
- [Preview shell served from raw blob URL lacks SPA routing] → same limitation as existing dev shell (ADR-0009 A5); acceptable for previews.

## Migration Plan

1. Extend `deploy-mfes-turbo.yml` (SHA paths, metadata, concurrency, prod tag flow) — legacy workflow still present but its dev job now redundant.
2. Delete `deploy-mfes.yml` in the same PR so no window with double prod tag handling exists.
3. Ship `deploy-website.yml` SHA/metadata changes independently (pointer behavior unchanged → zero risk to consumers).
4. Ship preview + cleanup workflows (purely additive).
5. Apply lifecycle policy via runbook procedure (idempotent `az storage account management-policy create`).

Rollback: revert workflow files; blobs under new prefixes age out via TTL. No consumer references SHA/preview paths implicitly, so rollback has no runtime impact.

## Open Questions

None blocking. TTL values (14/30 days) are defaults; revisit if storage cost or debugging retention needs change.
