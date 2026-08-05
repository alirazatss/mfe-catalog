# Tasks: Dev Preview Deployments and Immutable Dev Artifacts

Requirement IDs used below:

| ID     | Capability                | Requirement                                                                        |
| ------ | ------------------------- | ---------------------------------------------------------------------------------- |
| MDP-M1 | mfe-deployment-pipeline   | Unified workflow is canonical (`deploy-mfes-turbo.yml`); legacy removed (MODIFIED) |
| MDP-A1 | mfe-deployment-pipeline   | MFE dev deploy publishes immutable `sha-<short-sha>/` artifact                     |
| MDP-A2 | mfe-deployment-pipeline   | MFE dev deploy uploads `build-info.json`                                           |
| MDP-A3 | mfe-deployment-pipeline   | MFE dev deploys serialize per MFE+environment                                      |
| SDP-A1 | shell-deployment-pipeline | Shell dev deploy publishes immutable `sha-<short-sha>/` artifact                   |
| SDP-A2 | shell-deployment-pipeline | Shell dev deploy uploads `build-info.json`                                         |
| SDP-A3 | shell-deployment-pipeline | Shell dev deploys serialize per target                                             |
| ABL-A1 | azure-blob-storage-layout | Dev containers support `dev`/`sha-*`/`pr-*` path families                          |
| ABL-A2 | azure-blob-storage-layout | Lifecycle policy expires `pr-*` (14d) and `sha-*` (30d)                            |
| PPD-1  | pr-preview-deployments    | Same-repo PRs deploy changed MFEs to `pr-<n>/`                                     |
| PPD-2  | pr-preview-deployments    | Preview shell with PR-scoped remote config                                         |
| PPD-3  | pr-preview-deployments    | Fork PRs get no credentials/deploys                                                |
| PPD-4  | pr-preview-deployments    | Preview metadata + sticky PR comment                                               |
| PPD-5  | pr-preview-deployments    | PR close deletes preview artifacts                                                 |
| PPD-6  | pr-preview-deployments    | Preview deploys serialize per PR (cancel-in-progress)                              |

## 1. Canonical MFE dev pipeline

**Owns files:**

- `.github/workflows/deploy-mfes-turbo.yml`
- `.github/workflows/deploy-mfes.yml` (deletion)

**Depends on:** none

- [x] 1.1 Absorb the prod tag flow (tag trigger, tag/`package.json` version validation, versioned upload, config-pin PR job) from `deploy-mfes.yml` into `deploy-mfes-turbo.yml`
  - Requirements: MDP-M1
  - Owner: backend-developer
  - Verification: `act`/workflow-dispatch dry-run or pushed tag on a scratch MFE reaches the prod job path; YAML lint passes
- [x] 1.2 Add SHA-path upload step to the dev deploy job: conditional upload to `mfes-dev/<mfe>/sha-<short8>/` with `Cache-Control: public, max-age=31536000, immutable`, tolerating already-exists on re-run
  - Requirements: MDP-A1, ABL-A1
  - Owner: backend-developer
  - Verification: after a main push, `az storage blob list` shows both `dev/` and `sha-<short8>/` blobs; re-run leaves SHA blobs' ETags unchanged
- [x] 1.3 Generate and upload `build-info.json` (full commit SHA, run id, workflow name, ISO-8601 UTC timestamp) to both `dev/` and `sha-<short8>/` paths
  - Requirements: MDP-A2
  - Owner: backend-developer
  - Verification: `curl .../mfes-dev/<mfe>/dev/build-info.json | jq` returns all four fields matching the triggering run
- [x] 1.4 Add concurrency group `deploy-mfe-<matrix.mfe>-dev` with `cancel-in-progress: false` to the dev deploy job
  - Requirements: MDP-A3
  - Owner: backend-developer
  - Verification: two rapid pushes queue the second deploy job (visible in Actions UI); final `build-info.json` reports the newer SHA
- [x] 1.5 Delete `.github/workflows/deploy-mfes.yml` in the same PR as 1.1
  - Requirements: MDP-M1
  - Owner: backend-developer
  - Verification: a main push modifying one MFE starts exactly one MFE deploy workflow run
- [x] 1.6 End-to-end verification sweep of dev + tag flows against the spec scenarios for MDP-M1, MDP-A1–A3
  - Requirements: MDP-M1, MDP-A1, MDP-A2, MDP-A3
  - Owner: tester
  - Verification: each spec scenario checked against real workflow runs and blob listings; results recorded in the PR description

## 2. Shell dev pipeline

**Owns files:**

- `.github/workflows/deploy-website.yml`

**Depends on:** none

- [ ] 2.1 Add SHA-path upload step to the dev shell job: conditional upload to `dev-shell/sha-<short8>/` with immutable cache headers, tolerating already-exists on re-run
  - Requirements: SDP-A1, ABL-A1
  - Owner: backend-developer
  - Verification: after a main push, `dev-shell` contains root blobs plus `sha-<short8>/` blobs; re-run leaves SHA blobs unchanged
- [ ] 2.2 Generate and upload `build-info.json` to the `dev-shell` root and SHA path
  - Requirements: SDP-A2
  - Owner: backend-developer
  - Verification: `curl https://tssmfestorage.blob.core.windows.net/dev-shell/build-info.json | jq` returns commit SHA, run id, workflow name, timestamp
- [ ] 2.3 Scope the dev job's concurrency to group `deploy-website-dev` with `cancel-in-progress: false` (keep tag/prod groups separate)
  - Requirements: SDP-A3
  - Owner: backend-developer
  - Verification: two rapid shell merges show the second dev job queued, not cancelled and not racing
- [ ] 2.4 Verification sweep of shell dev spec scenarios (SDP-A1–A3)
  - Requirements: SDP-A1, SDP-A2, SDP-A3
  - Owner: tester
  - Verification: each scenario checked against workflow runs and blob listings; results recorded in the PR description

## 3. PR preview and cleanup workflows

**Owns files:**

- `.github/workflows/deploy-previews.yml` (new)
- `.github/workflows/cleanup-previews.yml` (new)
- `scripts/azure/generate-preview-config.ts` (new)
- `scripts/azure/generate-preview-config.test.ts` (new)

**Depends on:** none

- [x] 3.1 Write unit tests for the preview config generator (changed MFE → `pr-<n>` URL; untouched MFE keeps `dev/` URL; zero changed MFEs → config equals dev config), then implement `generate-preview-config.ts` reading `remotes.config.dev.json`
  - Requirements: PPD-2
  - Owner: backend-developer, tester
  - Verification: `vp test` passes for `scripts/azure/generate-preview-config.test.ts`
- [x] 3.2 Create `deploy-previews.yml`: trigger `pull_request` (opened/synchronize), Turborepo change detection against `origin/main...HEAD`, matrix deploy of changed MFEs to `mfes-dev/<mfe>/pr-<n>/` with no-cache headers
  - Requirements: PPD-1
  - Owner: backend-developer
  - Verification: test PR touching one MFE produces blobs only under that MFE's `pr-<n>/`; docs-only PR uploads nothing
- [x] 3.3 Add the preview shell job: build shell with generated per-PR config, upload to `dev-shell/pr-<n>/`
  - Requirements: PPD-2
  - Owner: backend-developer
  - Verification: `dev-shell/pr-<n>/remotes.config.json` points changed MFEs at `pr-<n>` URLs and others at `dev/` URLs
- [x] 3.4 Enforce the same-repo boundary: `pull_request` trigger (no `pull_request_target`) plus explicit `head.repo == base.repo` condition on every job requesting `id-token: write`
  - Requirements: PPD-3
  - Owner: backend-developer
  - Verification: fork PR run shows all credentialed jobs skipped; no blob writes; same-repo PR deploys normally
- [x] 3.5 Upload `build-info.json` (including PR number) to every preview path and create/update a single sticky PR comment listing preview shell and MFE URLs
  - Requirements: PPD-4
  - Owner: backend-developer
  - Verification: second push to the PR updates the existing comment in place; `build-info.json` reports head SHA and PR number
- [x] 3.6 Add concurrency group `preview-pr-<number>` with `cancel-in-progress: true` to `deploy-previews.yml`
  - Requirements: PPD-6
  - Owner: backend-developer
  - Verification: rapid double push cancels the first in-progress preview run; different PRs run in parallel
- [x] 3.7 Create `cleanup-previews.yml`: on PR close, delete `mfes-dev/*/pr-<n>/` and `dev-shell/pr-<n>/` prefixes only; succeed when nothing exists
  - Requirements: PPD-5
  - Owner: backend-developer
  - Verification: closing a test PR removes exactly its `pr-<n>` blobs; `dev/`, `sha-*`, and other PRs' blobs unchanged; closing a preview-less PR succeeds
- [x] 3.8 End-to-end verification sweep of all PPD spec scenarios with a real test PR lifecycle (open → push → push → close)
  - Requirements: PPD-1, PPD-2, PPD-3, PPD-4, PPD-5, PPD-6
  - Owner: tester
  - Verification: each scenario checked and recorded in the PR description

## 4. Azure lifecycle policy and runbook

**Owns files:**

- `docs/runbooks/azure-blob-provisioning.md`
- `scripts/azure/lifecycle-policy.json` (new)

**Depends on:** none

- [x] 4.1 Author `lifecycle-policy.json`: delete-after-modification rules for `pr-` prefixes (14 days) and `sha-` prefixes (30 days) scoped to `mfes-dev` and `dev-shell` prefix filters only
  - Requirements: ABL-A2
  - Owner: backend-developer
  - Verification: policy JSON validates via `az storage account management-policy create --dry-run`-equivalent review; prefix filters exclude `mfes-prod` and `$web`
- [x] 4.2 Add a runbook section documenting the path families (`dev`/`sha-*`/`pr-*`), TTL conventions, and the idempotent `az` command to apply the policy
  - Requirements: ABL-A1, ABL-A2
  - Owner: team-lead
  - Verification: runbook steps executed verbatim on `tssmfestorage` apply the policy; `az storage account management-policy show` returns the expected rules
- [x] 4.3 Apply the policy and verify prod containers are unmatched
  - Requirements: ABL-A2
  - Owner: backend-developer
  - Verification: `management-policy show` output reviewed; rules match only dev-container prefixes

## 5. Architecture docs

**Owns files:**

- `docs/adr/0010-dev-preview-deployments.md` (new)
- `CONTEXT.md`

**Depends on:** none

- [x] 5.1 Write ADR-0010 recording the immutable-SHA + PR-preview dev policy as an extension of ADR-0009 A3 (decision, alternatives, trade-offs, TTL conventions)
  - Requirements: MDP-A1, SDP-A1, PPD-1, ABL-A2 (documentation of)
  - Owner: architect
  - Verification: ADR follows existing `docs/adr/` format and cross-links ADR-0009
- [x] 5.2 Add glossary terms to `CONTEXT.md`: floating pointer, immutable dev artifact, preview deployment, build metadata file
  - Requirements: ABL-A1 (documentation of)
  - Owner: architect
  - Verification: terms present and consistent with spec wording
- [x] 5.3 Amend ADR-0009 A3 with a "superseded in part" pointer to ADR-0010
  - Requirements: MDP-A1 (documentation of)
  - Owner: architect
  - Verification: ADR-0009 links forward to ADR-0010

## Requirement coverage matrix

| Requirement | Covered by tasks   |
| ----------- | ------------------ |
| MDP-M1      | 1.1, 1.5, 1.6      |
| MDP-A1      | 1.2, 1.6, 5.1, 5.3 |
| MDP-A2      | 1.3, 1.6           |
| MDP-A3      | 1.4, 1.6           |
| SDP-A1      | 2.1, 2.4, 5.1      |
| SDP-A2      | 2.2, 2.4           |
| SDP-A3      | 2.3, 2.4           |
| ABL-A1      | 1.2, 2.1, 4.2, 5.2 |
| ABL-A2      | 4.1, 4.2, 4.3, 5.1 |
| PPD-1       | 3.2, 3.8, 5.1      |
| PPD-2       | 3.1, 3.3, 3.8      |
| PPD-3       | 3.4, 3.8           |
| PPD-4       | 3.5, 3.8           |
| PPD-5       | 3.7, 3.8           |
| PPD-6       | 3.6, 3.8           |

## Execution waves

- Wave 1 (parallel): task groups 1, 2, 3, 4, 5

All five groups have disjoint file ownership and no inter-group dependencies; they can execute in parallel worktrees and merge independently.
