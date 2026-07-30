## 1. Azure infrastructure provisioning

**Owns files:**

- `docs/runbooks/azure-blob-provisioning.md`

**Depends on:** none

- [ ] 1.1 Provision the single Azure Blob Storage account `tssmfestorage` in the target subscription. Enable Azure Blob static-website hosting (creates the `$web` container automatically). Create additional containers: `mfes-dev`, `mfes-prod`, `dev-shell`. Configure CORS at the account level to allow `GET`/`OPTIONS` from `*` with `Access-Control-Max-Age: 3600` (applies to all containers).
  - Requirements: ABL-Requirement-1 (single account, container-based separation), ABL-Requirement-2 (MFE path structure), ABL-Requirement-3 (`$web` prod + `dev-shell` dev), ABL-Requirement-4 (CORS)
  - Owner: architect, team-lead
  - Verification: `az storage account show --name tssmfestorage` returns the account with static-website enabled; `az storage container list --account-name tssmfestorage` shows exactly `mfes-dev`, `mfes-prod`, `dev-shell`, `$web`; `az storage cors show --services b --account-name tssmfestorage` returns the expected rule.

- [ ] 1.2 Create Azure AD applications `gha-mfe-dev` and `gha-mfe-prod`. Assign `Storage Blob Data Contributor` **scoped at the container level** (not account level): `gha-mfe-dev` on containers `mfes-dev` and `dev-shell`; `gha-mfe-prod` on containers `mfes-prod` and `$web`. Verify neither identity holds any account-level scope or role on the other environment's containers.
  - Requirements: OIDC-Requirement-2 (one identity per env, container-scoped RBAC)
  - Owner: architect, team-lead
  - Verification: `az role assignment list --assignee <client-id> --all` for each identity returns exactly two assignments; each `scope` string ends in `/blobServices/default/containers/<container-name>` (not the account resource ID); `gha-mfe-dev` shows no assignment referencing `mfes-prod`, `$web`; `gha-mfe-prod` shows none referencing `mfes-dev`, `dev-shell`.

- [ ] 1.3 Add federated credentials to each Azure AD app. `gha-mfe-dev` trusts subjects `repo:<owner>/<repo>:ref:refs/heads/main`. `gha-mfe-prod` trusts subject `repo:<owner>/<repo>:ref:refs/tags/*-v*` and only that.
  - Requirements: OIDC-Requirement-3 (prod tag-only trust), OIDC-Requirement-4 (dev main-only trust)
  - Owner: architect, team-lead
  - Verification: `az ad app federated-credential list --id <app-id>` returns the exact subject conditions; attempting `azure/login` from a feature branch with the prod client-id in a throwaway test workflow fails at token exchange.

- [ ] 1.4 Author the provisioning runbook at `docs/runbooks/azure-blob-provisioning.md` documenting every CLI command from tasks 1.1–1.3 with expected outputs and rollback steps. Include an explicit RBAC-scope-verification section (task 1.2 checks that scope IDs are container-level, not account-level) and an activity-log alert setup for `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete` events on `mfes-prod` and `$web`. Capture resulting `client-id`, `tenant-id`, `subscription-id` per environment as values to add to GitHub repository variables (never secrets).
  - Requirements: OIDC-Requirement-1 (no secrets stored)
  - Owner: team-lead, architect
  - Verification: Runbook re-executed against a scratch subscription reproduces the same layout; final section lists the three variables per env and confirms zero secret names are required; delete-alert rule is present.

## 2. Environment-specific shell remote configs

**Owns files:**

- `apps/shells/website/public/remotes.config.dev.json`
- `apps/shells/website/public/remotes.config.prod.json`
- `apps/shells/website/vite.config.ts` (build-time env selection changes only)

**Depends on:** none

- [ ] 2.1 Create `apps/shells/website/public/remotes.config.dev.json` with entries for `mfe-widget` and `mfe-landing-page` whose `entryUrl` values point to `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe-name>/dev/remoteEntry.js`. File MUST validate against the existing `remote-config-schema`.
  - Requirements: ERC-Requirement-1 (both files exist, schema-valid), ERC-Requirement-2 (dev uses floating URLs)
  - Owner: frontend-developer
  - Verification: Existing config-validation test suite (`openspec/specs/config-validation`) passes against the new file.

- [ ] 2.2 Create `apps/shells/website/public/remotes.config.prod.json` with entries for `mfe-widget` and `mfe-landing-page` initialized to placeholder version `v0.0.0` URLs (`https://tssmfestorage.blob.core.windows.net/mfes-prod/<mfe-name>/v0.0.0/remoteEntry.js`) and matching `version` fields. File MUST validate against `remote-config-schema`. Placeholder is superseded by the first real prod tag deploy.
  - Requirements: ERC-Requirement-1 (both files exist), ERC-Requirement-2 (prod pins concrete semver, no wildcards/latest)
  - Owner: frontend-developer
  - Verification: Config-validation tests pass; grep confirms no `/dev/`, `/latest/`, `^`, `~`, or `*` appears in any `entryUrl`.

- [ ] 2.3 Modify the shell build to select `remotes.config.<env>.json` at build time based on an env var (e.g. `DEPLOY_ENV=dev|prod`), copying it to `remotes.config.json` in the build output. The other environment's config MUST NOT appear in the artifact.
  - Requirements: SDP-Requirement-5 (env-correct config bundled)
  - Owner: frontend-developer
  - Verification: `DEPLOY_ENV=prod vp build` produces a `dist/` where `remotes.config.json` equals `remotes.config.prod.json` byte-for-byte and no `remotes.config.dev.json` file exists; symmetric for dev.

## 3. MFE deploy workflow (widget as reference implementation)

**Owns files:**

- `.github/workflows/deploy-mfe-widget.yml`
- `.github/workflows/deploy-mfe-landing-page.yml`

**Depends on:** task group 1 (Azure provisioning must be merged so `AZURE_CLIENT_ID_*`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` repo variables exist and the storage account/containers are reachable). Note: this group's workflows will at runtime open PRs that modify `remotes.config.prod.json` (owned by task group 2), which is a runtime behavior; authoring of this file remains task group 2's concern.

- [ ] 3.1 Author `.github/workflows/deploy-mfe-widget.yml` with two triggers: (a) `push` to `main` with path filter on `apps/mfes/mfe-widget/**`, packages the MFE depends on, and the workflow file itself; (b) `push` on tags matching `mfe-widget-v*`. Grant `permissions: id-token: write, contents: read, pull-requests: write`. Set concurrency group per environment so simultaneous pushes to `main` serialize but a prod tag can run independently.
  - Requirements: MDP-Requirement-1 (dev on push), MDP-Requirement-2 (prod on tag pattern), OIDC-Requirement-1 (id-token permission)
  - Owner: backend-developer, team-lead
  - Verification: Workflow file lints via `actionlint`; opening a PR that touches only `apps/mfes/mfe-landing-page/**` does not queue this workflow.

- [ ] 3.2 Add a `validate-version` job that runs on tag events only, extracts semver from `github.ref_name` (stripping `mfe-widget-v`), reads `apps/mfes/mfe-widget/package.json`, and fails if they differ. Job MUST fail before any Azure step runs.
  - Requirements: MDP-Requirement-3 (version parity)
  - Owner: backend-developer
  - Verification: Dry-run test — push a tag `mfe-widget-v9.9.9` while `package.json` says `0.1.0`; workflow fails at `validate-version` and never authenticates to Azure.

- [ ] 3.3 Add `deploy-dev` and `deploy-prod` jobs. Both authenticate via `azure/login@v2` using OIDC (no `client-secret`), with client-id/tenant-id/subscription-id from repo variables `AZURE_CLIENT_ID_DEV`/`_PROD`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`. Dev job runs on push-to-main; prod job runs on tag and depends on `validate-version`. Both jobs target the single account `tssmfestorage`; environment separation is by container.
  - Requirements: OIDC-Requirement-1 (OIDC only, no secrets)
  - Owner: backend-developer
  - Verification: `grep -r client-secret .github/workflows/` returns nothing; secrets audit shows no `AZURE_*_KEY` or `_SECRET` names.

- [ ] 3.4 In `deploy-dev`: build the MFE, then upload `apps/mfes/mfe-widget/dist/` to `tssmfestorage` container `mfes-dev` at prefix `mfe-widget/dev/` using `az storage blob upload-batch --overwrite` with `--content-cache-control "no-cache, must-revalidate"`.
  - Requirements: MDP-Requirement-5 (dev overwrites floating pointer), ABL-Requirement-2 (dev path structure)
  - Owner: backend-developer
  - Verification: After a successful run, `az storage blob show --container-name mfes-dev --name mfe-widget/dev/remoteEntry.js` returns `Cache-Control: no-cache, must-revalidate`; second dev run replaces prior contents.

- [ ] 3.5 In `deploy-prod`: build the MFE, then upload `dist/` to `tssmfestorage` container `mfes-prod` at prefix `mfe-widget/v<version>/` using conditional headers that fail if any blob at the prefix already exists (`az storage blob upload-batch --overwrite false` combined with a preflight `az storage blob exists` check on the prefix; if any hit, exit non-zero with a message naming the existing version). Set `--content-cache-control "public, max-age=31536000, immutable"` on the upload.
  - Requirements: MDP-Requirement-4 (refuse to overwrite versioned path), MDP-Requirement-6 (immutable cache header), ABL-Requirement-2 (prod path structure)
  - Owner: backend-developer
  - Verification: First tag `mfe-widget-v0.1.0` succeeds; re-pushing the same tag on a rebuilt SHA fails at upload with a message like "version 0.1.0 already exists in prod"; downloading the blob shows the immutable cache header.

- [ ] 3.6 In `deploy-prod`, after upload succeeds, add an `open-config-pr` step that (a) checks out `main`, (b) creates branch `bots/pin-mfe-widget-v<version>`, (c) modifies only the `mfe-widget` entry's `entryUrl` and `version` fields in `apps/shells/website/public/remotes.config.prod.json`, (d) commits and pushes, (e) opens a PR against `main` with title `chore(deploy): pin mfe-widget to v<version>` and body linking the tag and workflow run. Auto-merge MUST NOT be enabled.
  - Requirements: MDP-Requirement-7 (PR opened after successful upload, not on failure), ERC-Requirement-3 (PR diff scope minimal), ERC-Requirement-4 (no auto-merge)
  - Owner: backend-developer
  - Verification: Successful prod tag results in a PR whose diff `git diff main` touches only the specified two fields in that one file; forcing an upload failure in a dry-run confirms no PR is opened; PR settings show auto-merge disabled.

- [ ] 3.7 Duplicate the workflow as `.github/workflows/deploy-mfe-landing-page.yml`, substituting `mfe-widget` → `mfe-landing-page` in path filters, tag pattern, package.json path, and blob prefixes. Verify the two workflows are byte-diff-identical except for those substitutions.
  - Requirements: MDP-Requirement-1, MDP-Requirement-2, MDP-Requirement-3, MDP-Requirement-4, MDP-Requirement-5, MDP-Requirement-6, MDP-Requirement-7 (all mirrored for the second MFE)
  - Owner: backend-developer
  - Verification: `diff .github/workflows/deploy-mfe-widget.yml .github/workflows/deploy-mfe-landing-page.yml` shows only the substituted tokens; both files lint via `actionlint`.

## 4. Shell deploy workflow

**Owns files:**

- `.github/workflows/deploy-website.yml`

**Depends on:** task group 1 (Azure infra + repo variables), task group 2 (`remotes.config.*.json` and the build-time env selection in `vite.config.ts` must exist for the workflow's build step to select the right config).

- [ ] 4.1 Author `.github/workflows/deploy-website.yml` with three triggers: (a) `push` to `main` touching `apps/shells/website/**` → dev deploy; (b) `push` on tags matching `website-v*` → prod versioned deploy; (c) `push` to `main` touching `apps/shells/website/public/remotes.config.prod.json` → prod root-only redeploy (no new version). Grant OIDC `id-token: write` permission. Use path filters and job-level conditionals to route correctly.
  - Requirements: SDP-Requirement-1 (versioned prod deploy on tag), SDP-Requirement-3 (config-only merge triggers root redeploy), SDP-Requirement-4 (dev on push)
  - Owner: backend-developer, team-lead
  - Verification: Actionlint passes; matrix of trigger events → chosen job is documented in workflow comments and verified by a dry-run harness (see 6.1).

- [ ] 4.2 Add a `validate-version` job for tag events comparing `github.ref_name` (stripping `website-v`) against `apps/shells/website/package.json`. Fails before any Azure step.
  - Requirements: SDP-Requirement-2 (tag/package version parity)
  - Owner: backend-developer
  - Verification: Push tag `website-v9.9.9` while `package.json` says `0.0.1` — workflow fails at validate step.

- [ ] 4.3 `deploy-prod-versioned` job (tag trigger): build with `DEPLOY_ENV=prod`, upload `dist/` to `tssmfestorage` container `$web` at prefix `v<version>/` using the same fail-if-exists pattern as MFE prod uploads with `Cache-Control: public, max-age=31536000, immutable`, then copy the same build to the `$web/` root with `Cache-Control: no-cache, must-revalidate` (root is mutable/live).
  - Requirements: SDP-Requirement-1 (versioned + root)
  - Owner: backend-developer
  - Verification: First tag `website-v0.1.0` writes `$web/v0.1.0/` and updates `$web/` root; re-tag fails at versioned upload; `$web/` root serves latest via storage static-website endpoint.

- [ ] 4.4 `deploy-prod-config-only` job (push-to-main touching prod config): build with `DEPLOY_ENV=prod`, upload build to the `$web/` root only on `tssmfestorage`. MUST NOT write to any `$web/v*/` path. MUST leave existing `$web/v*/` blobs unmodified.
  - Requirements: SDP-Requirement-3 (config-only redeploy scope)
  - Owner: backend-developer
  - Verification: Before/after `az storage blob list --container-name '$web' --prefix v` returns identical output; only `$web/` root blob timestamps advance.

- [ ] 4.5 `deploy-dev` job (push-to-main): build with `DEPLOY_ENV=dev`, upload to `tssmfestorage` container `dev-shell` at root with `Cache-Control: no-cache, must-revalidate`. MUST NOT upload to `$web`.
  - Requirements: SDP-Requirement-4 (dev root deploy to dev-shell container)
  - Owner: backend-developer
  - Verification: Push to main producing a shell code change → `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html` reflects the new build within one workflow run; `$web` container is unmodified.

## 5. Documentation and ADR

**Owns files:**

- `docs/adr/0009-azure-blob-deployment-pipeline.md`
- `CONTEXT.md`

**Depends on:** task groups 1, 2, 3, 4 (ADR references what actually got built; CONTEXT.md snippet is corrected to match the shipped deployment shape).

- [ ] 5.1 Author `docs/adr/0009-azure-blob-deployment-pipeline.md` capturing decisions A1–A8 including MVP-revised A1 (single account) and A5 (asymmetric shell hosting) and A6 (container-scoped RBAC). Name debt explicitly: (a) A7 raw blob URLs / CDN deferred / migration options; (b) A8 no WORM; (c) MVP single-account model — future split into per-env accounts would require URL rewrites in every historical `remotes.config.prod.json`, likely combined with the A7 CDN migration; (d) dev shell served at raw blob URL (`dev-shell` container) because only one `$web` per account. Cross-link to ADR-0008 (version compatibility) noting complementary, non-overlapping scope. Cross-link to CONTEXT.md's CDN structure and explain the divergence.
  - Requirements: (documentation; supports all requirement groups by making decisions discoverable)
  - Owner: architect, team-lead
  - Verification: ADR reviewed and status set to `Accepted`; four named debt items link to concrete future ADRs (CDN migration, WORM adoption, per-env account split, dev shell URL polish).

- [ ] 5.2 Update `CONTEXT.md`'s "Key Decisions" section to reference ADR-0009 and correct the illustrative `aws s3 sync` snippet under decision 7 (MFE Deployment) to reflect the actual Azure Blob + OIDC + git-tag model.
  - Requirements: (documentation consistency)
  - Owner: team-lead
  - Verification: `grep -n "aws s3" CONTEXT.md` returns no matches after edit; a new subsection references ADR-0009.

## 6. End-to-end verification

**Owns files:**

- `docs/runbooks/azure-blob-deployment-e2e.md` (new — verification harness and evidence log)

**Depends on:** task groups 1, 2, 3, 4 (nothing to verify until infra, configs, and both deploy workflows are merged). Task group 5 is not a blocker — ADR authoring runs in parallel with E2E execution.

- [ ] 6.1 Author a workflow-trigger dry-run harness: a matrix of synthetic events (push to main with various path filters, tags with various patterns, workflow_dispatch attempts) documented as a table, each with expected outcome (which job runs, or "no workflow triggered", or "token exchange fails"). Run against the deployed workflows using `gh workflow run` and by pushing throwaway tags to a scratch branch. Persist the matrix and captured evidence under `docs/runbooks/azure-blob-deployment-e2e.md`.
  - Requirements: MDP-Requirement-1, MDP-Requirement-2, SDP-Requirement-1, SDP-Requirement-3, SDP-Requirement-4, OIDC-Requirement-3, OIDC-Requirement-4
  - Owner: tester
  - Verification: All rows in the matrix produce the expected outcome; failure rows (token exchange failures) are confirmed in Azure AD sign-in logs.

- [ ] 6.2 Execute the first end-to-end prod release for `mfe-widget`: bump `package.json` to `0.1.0`, tag `mfe-widget-v0.1.0`, verify (a) upload succeeds, (b) PR opens against `remotes.config.prod.json` with correct minimal diff, (c) merging PR triggers `deploy-prod-config-only` on the shell, (d) shell prod static-website endpoint loads pinned MFE URL and renders correctly.
  - Requirements: MDP-Requirement-2, MDP-Requirement-3, MDP-Requirement-4, MDP-Requirement-6, MDP-Requirement-7, ERC-Requirement-3, ERC-Requirement-4, SDP-Requirement-3
  - Owner: tester
  - Verification: All four checkpoints pass; browser devtools show `remoteEntry.js` loaded from `tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v0.1.0/`.

- [ ] 6.3 Attempt to re-tag `mfe-widget-v0.1.0` on a different commit after 6.2 succeeds. Verify workflow fails at the fail-if-exists upload step with a clear error, no blob is modified, no PR is opened, and Azure activity logs show no successful `blobs/write` operations.
  - Requirements: MDP-Requirement-4 (immutability guarantee), MDP-Requirement-7 (no PR on failure)
  - Owner: tester
  - Verification: Workflow fails at expected step; `az storage blob show` returns unchanged `Last-Modified` on the versioned blob; PR list shows no new PR from this run.

- [ ] 6.4 Attempt a prod deploy from a feature branch via `workflow_dispatch` (or by pushing a non-matching tag like `test-tag`). Verify Azure AD token exchange fails and no artifact is uploaded.
  - Requirements: OIDC-Requirement-3 (prod tag-only trust)
  - Owner: tester
  - Verification: Workflow fails at `azure/login` step; Azure AD sign-in logs show a rejected federated-credential exchange with the subject that was attempted.

## Requirement coverage matrix

| Requirement                                    | Task(s)            |
| ---------------------------------------------- | ------------------ |
| MDP-Requirement-1 (dev on push)                | 3.1, 3.7, 6.1      |
| MDP-Requirement-2 (prod on tag)                | 3.1, 3.7, 6.1, 6.2 |
| MDP-Requirement-3 (version parity)             | 3.2, 3.7, 6.2      |
| MDP-Requirement-4 (no overwrite)               | 3.5, 3.7, 6.2, 6.3 |
| MDP-Requirement-5 (dev floating)               | 3.4, 3.7           |
| MDP-Requirement-6 (immutable cache)            | 3.5, 3.7, 6.2      |
| MDP-Requirement-7 (PR after success)           | 3.6, 3.7, 6.2, 6.3 |
| SDP-Requirement-1 (versioned + root)           | 4.1, 4.3           |
| SDP-Requirement-2 (shell version parity)       | 4.2                |
| SDP-Requirement-3 (config-only redeploy)       | 4.1, 4.4, 6.1, 6.2 |
| SDP-Requirement-4 (dev shell)                  | 4.1, 4.5, 6.1      |
| SDP-Requirement-5 (env-correct bundle)         | 2.3                |
| ABL-Requirement-1 (dedicated accounts)         | 1.1, 1.2           |
| ABL-Requirement-2 (path structure)             | 1.1, 3.4, 3.5      |
| ABL-Requirement-3 (`$web` container)           | 1.1, 4.3           |
| ABL-Requirement-4 (CORS)                       | 1.1                |
| ABL-Requirement-5 (future-env-friendly naming) | 1.1, 1.4, 5.1      |
| OIDC-Requirement-1 (no secrets, OIDC only)     | 1.4, 3.3           |
| OIDC-Requirement-2 (one identity per env)      | 1.2                |
| OIDC-Requirement-3 (prod tag trust)            | 1.3, 6.1, 6.4      |
| OIDC-Requirement-4 (dev main trust)            | 1.3, 6.1           |
| ERC-Requirement-1 (both configs, schema-valid) | 2.1, 2.2           |
| ERC-Requirement-2 (dev floating / prod pinned) | 2.1, 2.2           |
| ERC-Requirement-3 (minimal PR diff)            | 3.6, 3.7, 6.2      |
| ERC-Requirement-4 (no auto-merge)              | 3.6, 3.7, 6.2      |

## Execution waves

Derived from the dependency graph across task groups 1–6. Each wave MUST complete (all PRs merged to `main`) before the next wave begins.

- **Wave 1 (parallel):** task groups 1, 2. No dependencies; can be spawned as concurrent agent sessions in isolated worktrees.
- **Wave 2 (parallel, after wave 1 merges):** task groups 3, 4. Both need task group 1's infra and repo variables merged; task group 4 additionally needs task group 2's config files and build-time selection merged.
- **Wave 3 (parallel, after wave 2 merges):** task groups 5, 6. Task group 5 (ADR + CONTEXT.md) documents what shipped; task group 6 (E2E verification) exercises what shipped. They own different files and are safely parallel.

Total: 3 waves, up to 6 concurrent worktrees at peak (waves 1 and 2 each have 2 parallel groups; wave 3 has 2 parallel groups). At any point, each worktree maps to exactly one branch and one PR per spec-executor rules.
