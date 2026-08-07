# Tasks: release-channel-deployments

## 1. Channel input and release triggers for shell deploys

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-shell.yml`, `.github/workflows/deploy-website.yml` (and any other shell caller workflows)
Depends on: nothing

- [ ] 1.1 Add `channel` input to `.github/workflows/deploy-shell.yml`; map empty/`dev` to `dev-shell/<shell-name>/` and `release-<major.minor>` to `dev-shell/<shell-name>/release-<major.minor>/`, including nested `sha-<short-sha>/` immutable upload and `build-info.json` under the channel prefix (reusable-shell-deploy-workflow: channel input requirement)
- [ ] 1.2 Set concurrency group to `deploy-<shell-name>-<channel>` with `cancel-in-progress: false` (reusable-shell-deploy-workflow: channel concurrency requirement)
- [ ] 1.3 Add branch↔version validation step: on `release-<major.minor>` refs, fail before upload unless `<shell-path>/package.json` major.minor matches (reusable-shell-deploy-workflow: branch↔version validation requirement)
- [ ] 1.4 Add `release-*` push triggers (path-scoped) to each shell caller workflow, passing `channel: ${{ github.ref_name }}` (reusable-shell-deploy-workflow: caller mapping requirement)

## 2. MFE release-channel deploys

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-mfes-turbo.yml`
Depends on: nothing

- [ ] 2.1 Add `release-*` push trigger to `deploy-mfes-turbo.yml`, reusing turbo change detection to select changed MFEs (mfe-deployment-pipeline: release-channel deploy requirement)
- [ ] 2.2 Route release-branch runs to `mfes-dev/<mfe-name>/release-<major.minor>/` with nested immutable `sha-<short-sha>/` copy and `build-info.json`; leave `dev/` pointer untouched on release runs (mfe-deployment-pipeline: release-channel deploy requirement)
- [ ] 2.3 Key MFE deploy concurrency by MFE and channel with `cancel-in-progress: false` (mfe-deployment-pipeline: channel serialization scenario)

## 3. Channel-aware config generation

Owner skill: backend-developer
Owns files: `scripts/generate-config.ts`, `scripts/azure/generate-preview-config.ts`, related unit tests
Depends on: nothing

- [ ] 3.1 Add optional channel parameter to `scripts/generate-config.ts`: emit `release-<major.minor>/` MFE URLs, falling back to the `dev/` pointer URL when the MFE has no channel build (blob existence check); unchanged output when no channel given (config-generation: channel-aware URL requirement)
- [ ] 3.2 Extend `scripts/azure/generate-preview-config.ts` to accept a base-channel argument so unchanged MFEs resolve to the base branch's channel URL with dev fallback (pr-preview-deployments: release-target preview requirement)
- [ ] 3.3 Unit tests covering channel URL emission, dev fallback, no-channel byte-equivalence, and schema validation of channel configs (config-generation scenarios)

## 4. Release-target PR previews

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-previews.yml`, `.github/workflows/cleanup-previews.yml`
Depends on: Group 3

- [ ] 4.1 Extend `deploy-previews.yml` PR triggers/conditions to include base branches matching `release-*`, deriving the base channel from `github.base_ref` and passing it to preview config generation (pr-preview-deployments: release-target preview requirement)
- [ ] 4.2 Verify `cleanup-previews.yml` deletes `pr-<n>/` blobs for release-target PRs identically and never touches `release-*/` channel blobs; adjust prefix filters if needed (pr-preview-deployments: cleanup scenario)

## 5. Lifecycle policy, backport automation, and docs

Owner skill: backend-developer
Owns files: Azure lifecycle policy definition (`scripts/azure/` / runbook), `.github/workflows/backport.yml`, `docs/runbooks/azure-blob-provisioning.md`, new release-process doc
Depends on: nothing

- [ ] 5.1 Add lifecycle rule deleting `release-` prefixed blobs in `mfes-dev` and `dev-shell` 90 days after last modification; confirm existing pr-/sha- rules and prod/floating exclusions still hold (azure-blob-storage-layout: lifecycle requirement)
- [ ] 5.2 Create `.github/workflows/backport.yml`: on merged main PRs labeled `backport release-<major.minor>`, cherry-pick onto the target branch and open a linked PR; support multiple labels (backport-automation: cherry-pick requirement)
- [ ] 5.3 On cherry-pick conflict, comment on the source PR with target branch and conflicting SHAs instead of opening a PR (backport-automation: conflict feedback requirement)
- [ ] 5.4 Update the provisioning runbook (lifecycle rule) and write the release-process doc: cut procedure, version bump discipline, fix-on-main + backport rule, branch-protection recommendation for `release-*`, shell-redeploy-after-MFE-backport note

## Execution waves

- Wave 1: Groups 1, 2, 3, 5 in parallel (disjoint files, no dependencies)
- Wave 2: Group 4 (needs Group 3's channel-aware preview config)
