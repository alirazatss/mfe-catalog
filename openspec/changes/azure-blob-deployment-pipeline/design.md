## Context

The `mf-mono` repository currently has no deployment automation. Local `pnpm build` produces `dist/` folders for each MFE and the shell, but there is no defined mechanism to publish those artifacts, no story for environment separation, and no immutability guarantee for released MFE versions. Since the shell loads MFEs at runtime by URL (per `dynamic-loader` and `remote-config-schema`), any deployment approach that lets a published version be overwritten in place would silently corrupt every historical shell build that pinned to that URL — the single largest operational risk in a micro-frontend architecture.

Existing repo context that this design MUST respect:

- **CONTEXT.md** describes the target CDN layout as `<cdn>/<env>/<mfe>@<version>/remoteEntry.js`. This design maps that concept onto Azure Blob Storage using per-environment storage accounts rather than a single account with an env prefix.
- **ADR-0008** covers _runtime version compatibility_ (React 19 → 20 migrations). It does NOT cover deployment artifacts. This change is complementary, not conflicting.
- **`remote-config-schema` capability** describes the schema of the config file the shell reads at runtime. This design uses two files that both conform to that schema; it does not modify the schema.
- Alignment session (Q1–Q8, this thread) locked eight decisions labelled A1–A8. Every technical choice below traces to one of those.

## Goals / Non-Goals

**Goals:**

- Publish MFE and shell artifacts to Azure Blob Storage with a versioned path structure that MUST NOT be overwritten in prod.
- Trigger production deploys exclusively via git tags matching `<app-name>-v<semver>`, giving each release a durable, git-native audit record.
- Enforce environment isolation at the Azure identity boundary: the dev workflow identity MUST NOT be able to write to prod storage, and vice versa.
- Eliminate long-lived Azure credentials from GitHub via OIDC federated identity.
- Keep prod MFE version pinning in git (`remotes.config.prod.json`) so the shell's history is auditable and no external manifest server is required.
- Automate the mechanical part of the prod version bump (open PR) while keeping a human gate on the merge.
- Shape the workflow and storage naming so that adding `sst` and `demo` environments later is additive, not a rewrite.

**Non-Goals:**

- No CDN, no custom domain, no Azure Front Door in this change (decision A7, deferred with named debt).
- No WORM immutability policy on the storage account (decision A8, deferred). Workflow-level `--if-none-match` plus OIDC scoping is the enforcement model for now.
- No `sst` or `demo` environments in this change (decision A2, deferred; workflow shape supports them).
- No automated retention/cleanup of old versioned blobs (decision A8; keep everything).
- No changes to shell runtime code, dynamic loader, or `remote-config-schema`. This change is pure deployment plumbing plus two new config files.
- No cross-environment promotion tooling. A prod release is always a fresh git tag build, never a copy from dev.
- No preview environments for pull requests. Dev is the only pre-prod integration surface.

## Decisions

### D1 — Single storage account with container-based environment separation (A1, MVP-revised)

One Azure Blob Storage account: `tssmfestorage`. Environments separated by container:

- `mfes-dev` — dev MFE artifacts
- `mfes-prod` — prod MFE artifacts (immutable versioned paths)
- `dev-shell` — dev shell (served as raw blob)
- `$web` — prod shell (served via Azure Blob static-website endpoint; only one `$web` per account)

Alternatives considered: (a) separate storage account per environment — rejected for MVP to reduce provisioning surface and cost tracking overhead; documented as debt because migrating later requires rewriting every URL in every historical `remotes.config.prod.json`; (b) single container with path-prefix env separation (`mfes/dev/...`, `mfes/prod/...`) — rejected because Azure RBAC is per-container, not per-prefix; scoping identities to a path prefix requires ABAC conditions, which is a preview feature and more error-prone than container-level scoping.

Environment isolation is enforced entirely by **container-scoped RBAC** (see D5). This is genuinely weaker than separate accounts: a misconfigured role assignment could grant cross-env write access. The compensating control is a mandatory verification step in the runbook (`az role assignment list --assignee <client-id>` must show container-level scope IDs, not account-level).

The static-website hosting constraint is the reason the shell hosting model is asymmetric across environments (see D6). Only one `$web` per account; that slot goes to prod.

### D2 — Versioned immutable paths, guarded by conditional upload (A3, A8)

Prod MFE uploads go to container `mfes-prod` at path `<mfe-name>/v<semver>/` with `azcopy` or `az storage blob upload-batch` using conditional headers equivalent to `If-None-Match: *`. If any blob at the target prefix already exists, the upload fails. This is the primary immutability guarantee. WORM (decision A8) was rejected as unforgiving for a team shipping fast; workflow-level enforcement is enough given the identity scoping. The debt is: someone with account-owner rights could still delete a blob out-of-band. That risk is accepted and named in ADR-0009.

Cache-Control for versioned prod blobs: `public, max-age=31536000, immutable`. For dev floating pointers and dev shell root: `no-cache, must-revalidate`. This mirrors what a CDN would eventually do and means the future CDN migration (A7 debt) doesn't need cache header rewrites.

### D3 — Git tag pattern `<app-name>-v<semver>` as the sole prod trigger (A3)

Alternatives considered: (a) branch-based (merge to `release/*`) — rejected because git tags give a stronger audit trail and let a single `main` branch handle all environments; (b) changesets / release-please — rejected as unnecessary tooling weight for a repo with three deployables; (c) manual `workflow_dispatch` only — rejected because it removes the "tag = release" invariant that makes rollback simple.

Workflow validates `tag.version == package.json.version` before doing anything else. Any drift fails the workflow with a clear message. Rollback is `git tag mfe-widget-v1.2.0 <old-sha> && git push --tags` — but only works if the workflow refuses to overwrite (D2), so rollback of a _specific version_ is impossible; rollback means shipping a new patch version or reverting the config PR. Named as a trade-off, not a bug.

### D4 — Prod config lives in git; MFE workflow opens PR to update it (A4)

The shell reads `remotes.config.json` at runtime. To pin prod versions without running a manifest server, we ship two files (`remotes.config.dev.json`, `remotes.config.prod.json`) and select one at build time. Successful prod MFE deploy opens a same-repo PR bumping the pinned version. Alternatives considered: (a) runtime-fetched manifest from blob — rejected per user requirement ("no manifest server"); (b) direct commit to main from workflow — rejected because a bot-authored config change to prod deserves a human read; (c) monorepo tool auto-updates config as part of the same tag build — rejected because we want the shell rebuild to be a separate, reviewable event.

PR uses `GITHUB_TOKEN` while the repo is a monorepo. When shells split into separate repos (CONTEXT.md's future state), this becomes a GitHub App installation. That upgrade path is called out in ADR-0009.

### D5 — OIDC federated identity, one AD app per environment, container-scoped RBAC (A6, MVP-revised)

Two Azure AD applications: `gha-mfe-dev` trusts GitHub OIDC subjects matching `repo:<owner>/<repo>:ref:refs/heads/main`; `gha-mfe-prod` trusts only `repo:<owner>/<repo>:ref:refs/tags/*-v*`. Each app holds `Storage Blob Data Contributor` scoped at the **container** level — not the account level — on its own environment's containers only:

- `gha-mfe-dev` → contributor on `mfes-dev` and `dev-shell`
- `gha-mfe-prod` → contributor on `mfes-prod` and `$web`

Alternatives considered: (a) storage account access keys as GitHub secrets — rejected because a leaked key destroys the immutability guarantee (D2); (b) SAS tokens — rejected because they still need a bootstrap secret and rotate manually; (c) self-hosted runner with managed identity — rejected as infra overkill; (d) account-scoped RBAC — was the original design; rejected under the single-account MVP model because it would let either identity write anywhere.

Container-scoped RBAC is fiddlier than account-scoped and more prone to misconfig. Compensating control: the runbook includes an explicit verification step (`az role assignment list --assignee <client-id> --all`) that must show scope IDs ending in `/containers/<container-name>`, not account-level scopes.

The prod trust condition is the second layer of the immutability guarantee: even if the prod workflow file is compromised to try uploading from a feature branch, Azure AD refuses to issue a token because the subject doesn't match.

### D6 — Asymmetric shell hosting per environment (A5, MVP-revised)

Azure Blob static-website hosting provides exactly one `$web` container per storage account. In the single-account MVP model (D1), only one environment can use the static-website endpoint.

- **Prod shell** → `$web/v<version>/` (immutable versioned copy) + `$web/` root (mutable live copy). Served via the static-website endpoint at `https://tssmfestorage.z<region>.web.core.windows.net/`.
- **Dev shell** → `dev-shell/` container root (mutable). Served as raw blob URL at `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html`.

The dev shell URL is ugly. This is acceptable because dev is internal-only. When (or if) a CDN is added later, dev can also gain a clean URL via hostname routing.

Two prod trigger types (unchanged from original A5):

1. Tag `website-v<semver>` → full versioned deploy to `$web/v<version>/` + copy to `$web/` root.
2. Merge to `main` touching `remotes.config.prod.json` → rebuild + copy to `$web/` root only, no new version cut.

Alternatives considered: (a) always cut a new shell version on any config change — rejected because it inflates shell versions with no code change; (b) don't use static-website hosting at all, serve prod from a regular container too — rejected because prod deserves the clean root URL and there's no cost to keeping it; (c) two storage accounts to give both envs a `$web` — that's the original D1 design, rejected for MVP.

`$web/` root is mutable. That's acceptable because live traffic MUST see the latest by definition; the versioned copy underneath is the audit record.

### D7 — Raw blob URLs in configs; CDN deferred (A7)

Prod MFE config points at `https://tssmfestorage.blob.core.windows.net/mfes-prod/<mfe>/v<version>/remoteEntry.js`. Dev MFE config points at `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe>/dev/remoteEntry.js`. Dev shell served at `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html`. Prod shell served at the static-website endpoint (`https://tssmfestorage.z<region>.web.core.windows.net/`).

Ugly, region-locked, single-tier cache. Chosen for speed of delivery. The debt is real and named: when a CDN + custom domain arrives, every historical `remotes.config.prod.json` in git will forever reference raw blob URLs, so old shell versions can't transparently migrate. Combined with the single-account debt (D1), migrating to per-env accounts _and_ adding a CDN at the same time will rewrite every URL simultaneously — which is arguably a convenience.

Mitigation options at CDN-adoption time — dual-host, accept broken old shells, or history rewrite — are documented in ADR-0009 so future-us knows the choices going in.

### D8 — Ship dev + prod, shape for sst/demo (A2)

Workflow files parameterize environment via inputs where possible. Container naming (`mfes-<env>`, `<env>-shell` where applicable, `$web` reserved for prod), and path structure (`<mfe>/v<version>/`) are additive across environments. Adding `sst` requires: (1) creating containers `mfes-sst` and `sst-shell` on the same account, (2) creating a `gha-mfe-sst` AD app with container-scoped RBAC, (3) copy-pasting a job in each workflow. No renames, no schema changes. The one asymmetry — `$web` for prod only — persists; every additional environment gets a raw-blob shell URL until (or unless) a CDN is added.

## Risks / Trade-offs

- **Single-account model = weaker isolation (D1, D5)** → Named in ADR-0009 as MVP debt. Mitigation: container-scoped RBAC verified via runbook check, plus OIDC subject-condition enforcement. Failure mode: a role assignment misconfigured with account scope instead of container scope grants cross-env access. Detection: mandatory `az role assignment list` verification step during provisioning. When migrating to per-env accounts (post-MVP), all URLs in `remotes.config.prod.json` will need rewrites — same category of debt as D7.
- **Dev shell URL is a raw blob path (D6)** → Named. Cosmetic-only; dev is internal. Absorbed into the D7 CDN migration when it happens.
- **Raw blob URL fossilization (D7)** → Named in ADR-0009. Mitigation at CDN-adoption time: dual-host period during which both raw blob and CDN URLs resolve, capped at 90 days. Old shell versions past that window will fail to load MFEs; users are expected to be on recent shell versions anyway (shell root is mutable and always current).
- **No WORM = human can delete a prod version (D2)** → Mitigation: RBAC principle of least privilege. Only two humans hold owner rights on `tssmfestorage`; deletion requires portal or CLI access, which is audited by Azure activity logs. Alerting on `Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete` events is added to the runbook.
- **Bot PR fatigue / merge lag (D4)** → Mitigation: PR title and body are consistent enough for CODEOWNERS auto-assignment. Escalation policy: if a prod config PR sits open >24h, the on-call rotation gets pinged. Documented in the runbook.
- **Tag/package.json drift (D3)** → Workflow validates before uploading. If validation fails, developer sees a clear error and re-tags after bumping `package.json`. The wasted tag is inconsequential (git tags are cheap).
- **Same-repo PR uses `GITHUB_TOKEN` — won't work cross-repo (D4)** → Documented upgrade path to GitHub App. Not blocking today.
- **No preview envs for PRs** → Accepted. Dev deploys on merge to `main` are the integration surface; PRs run tests only. Adding PR previews would require per-PR ephemeral paths in `mfes-dev` (`mfes-dev/<mfe>/pr-<num>/`), left as a future ADR.
- **Rollback of a specific prod MFE version is impossible (D3)** → Trade-off, not a bug. Rollback means either (a) merge a config PR pointing back at the old `v<version>/` (which still exists — D2 guarantees it), or (b) ship a new patch version. Option (a) is a 30-second operation.
- **`workflow_dispatch` bypass of prod trust condition (D5)** → The prod federated credential does NOT trust `workflow_dispatch`. Attempting a manual prod run will fail at the `azure/login` step. This is intentional — the whole immutability model depends on tags being the only prod trigger.
- **First-time Azure provisioning is manual** → Runbook (`docs/runbooks/azure-blob-provisioning.md`) covers this. Terraform/Bicep-ification is a follow-up ADR, not blocking.

## Migration Plan

No existing deployments to migrate. Rollout order:

1. **Provision Azure infra** (dev first, then prod) following the runbook. Verify each step's outputs are captured as GitHub repository variables (never secrets).
2. **Land config files** (`remotes.config.dev.json`, `remotes.config.prod.json`) with URLs the shell can't yet reach. Merged to `main`, does nothing at runtime yet because no deploy has happened.
3. **Land dev MFE workflow** for one MFE first (`mfe-widget`). Push to `main` triggers dev deploy. Manually verify the URL in `remotes.config.dev.json` resolves.
4. **Land dev workflow for second MFE and shell**. End-to-end dev works.
5. **Cut first prod tag** on `mfe-widget-v0.1.0`. Verify: (a) upload succeeds to `v0.1.0/`, (b) PR opens against `remotes.config.prod.json`, (c) merging PR triggers shell config-only prod deploy, (d) prod shell loads pinned MFE version.
6. **Cut prod tag for second MFE and shell**. Full E2E prod verified.
7. **Write ADR-0009** capturing all decisions and named debt. Merge before closing this change.

Rollback strategy per artifact:

- **Bad MFE prod release** → Revert the config PR (or open a new one pointing at prior `v<version>/`); shell auto-redeploys with old pinned URL. No blob deletion needed.
- **Bad shell prod release** → Re-run the workflow for the previous `website-v<version>` tag. The versioned artifact still exists (D6), the job re-copies it to `$web/` root.
- **Bad infra change** → Terraform/Bicep is out of scope, so infra rollback is manual via Azure portal. Runbook lists steps.
