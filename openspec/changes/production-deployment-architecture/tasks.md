## 1. Manifest Schema & Validation

- [x] 1.1 Create `manifest.schema.json` with complete schema definition
- [x] 1.2 Add JSON schema validation to existing schema directory structure
- [x] 1.3 Create TypeScript types from manifest schema
- [x] 1.4 Write unit tests for manifest schema validation
- [x] 1.5 Document manifest format in README

**Depends on**: None (starting point)  
**Skill**: Backend developer or frontend developer  
**Estimate**: 2-3 hours

---

## 2. Manifest Generation Script

- [x] 2.1 Create `scripts/generate-manifest.ts` file
- [x] 2.2 Implement manifest structure generation from discovered MFEs
- [x] 2.3 Add SRI hash computation (SHA-384) for remoteEntry.js files
- [x] 2.4 Add git metadata extraction (commit SHA, timestamp)
- [x] 2.5 Implement environment-specific URL generation (dev/staging/prod)
- [x] 2.6 Add manifest JSON schema validation before output
- [x] 2.7 Write manifest to `manifest.production.json` (gitignored)
- [x] 2.8 Add CLI flags: `--env`, `--output`, `--base-url` (Azure Blob Storage account URL, e.g. `https://tssmfestorage.blob.core.windows.net`)
- [x] 2.9 Write unit tests for manifest generation logic
- [x] 2.10 Add integration test with sample MFE directory

**Depends on**: Section 1 (manifest schema)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 6-8 hours

---

## 3. Update Config Generation for Dual Format

- [ ] 3.1 Refactor `scripts/generate-config.ts` to support output format selection
- [ ] 3.2 Extract common MFE discovery logic into shared function
- [ ] 3.3 Implement remotes.config.json generation (existing format, unchanged)
- [ ] 3.4 Implement manifest.json generation (new format) using entry URLs of the form `https://tssmfestorage.blob.core.windows.net/mfes-<env>/<mfe-name>/<dev|v<version>>/remoteEntry.js` — the same Azure Blob layout `azure-blob-deployment-pipeline` already established for `remotes.config.<env>.json`
- [ ] 3.5 Add `--format` flag to choose output (config | manifest)
- [ ] 3.6 Update package.json scripts: `generate:config` and `generate:manifest`
- [ ] 3.7 Update tests to cover both output formats
- [ ] 3.8 Ensure development workflow still generates remotes.config.json

**Depends on**: Section 2 (manifest generation)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 4-5 hours

---

## 4. Dynamic Loader Manifest Support

- [ ] 4.1 Add manifest parsing logic to dynamic-loader
- [ ] 4.2 Implement manifest-to-config transformation function
- [ ] 4.3 Update `loader.init()` to accept optional manifest parameter
- [ ] 4.4 Add localStorage caching for fetched manifest (24h TTL)
- [ ] 4.5 Implement cache expiration and fallback logic
- [ ] 4.6 Add SRI integrity attribute to script tags when available
- [ ] 4.7 Update loader to validate manifest schema on fetch
- [ ] 4.8 Add manifest version compatibility check
- [ ] 4.9 Write unit tests for manifest parsing and transformation
- [ ] 4.10 Write integration tests for manifest-based loading
- [ ] 4.11 Update dynamic-loader README with manifest documentation

**Depends on**: Section 1 (manifest schema)  
**Skill**: Use #file:~/.agents/skills/backend-developer/SKILL.md  
**Estimate**: 6-7 hours

---

## 5. Shell Bootstrap Manifest Integration

- [ ] 5.1 Update `apps/shells/website/src/config/remotes.ts` to fetch manifest
- [ ] 5.2 Add environment-based manifest URL selection (dev/prod)
- [ ] 5.3 Implement manifest fetch with retry logic (3 attempts, exponential backoff)
- [ ] 5.4 Add timeout handling (10 second max)
- [ ] 5.5 Implement localStorage cache fallback on fetch failure
- [ ] 5.6 Add error UI for manifest fetch failures with retry button
- [ ] 5.7 Update shell initialization to wait for manifest before rendering
- [ ] 5.8 Add manifest polling for updates (every 5 minutes)
- [ ] 5.9 Display notification when new manifest version detected
- [ ] 5.10 Test with mock manifest URLs in development
- [ ] 5.11 Update website README with manifest bootstrap documentation

**Depends on**: Section 4 (dynamic loader manifest support)  
**Skill**: Use #file:~/.agents/skills/frontend-developer/SKILL.md  
**Estimate**: 5-6 hours

---

## 6. Versioning Infrastructure

- [ ] 6.1 Document semantic versioning policy in CONTRIBUTING.md
- [ ] 6.2 Add PR check script to validate version bumps in changed MFEs
- [ ] 6.3 Create `scripts/check-version-bump.ts` script
- [ ] 6.4 Add version bump check to GitHub Actions PR workflow
- [ ] 6.5 Add `.changeset` or conventional commits configuration (optional)
- [ ] 6.6 Document version bump workflow in README

**Depends on**: None  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 3-4 hours

---

## 7. Manifest Upload via Existing Azure Deploy Workflow

**Supersedes the original "CDN Upload Script" scope.** `azure-blob-deployment-pipeline` already built and owns the MFE asset upload path (`az storage blob upload-batch` against `tssmfestorage`, OIDC auth, per-env cache headers, prod immutability guard). This group only adds manifest.json upload on top of that existing mechanism — it does **not** introduce a new script, a new provider abstraction, or new credentials.

- [ ] 7.1 Add a `generate-manifest` step to the existing `.github/workflows/deploy-mfes.yml` (from `azure-blob-deployment-pipeline`), run after each MFE's asset upload succeeds
- [ ] 7.2 Upload `manifest.json` via `az storage blob upload --overwrite` to `mfes-dev/manifest.json` (dev deploys) or `mfes-prod/manifest.json` (prod deploys) — reusing the same `gha-mfe-dev`/`gha-mfe-prod` OIDC identities, no new credentials
- [ ] 7.3 Set `--content-cache-control "public, max-age=60"` on the manifest blob (mutable, short-lived — unlike the immutable per-version MFE assets)
- [ ] 7.4 Implement post-upload integrity verification: re-fetch the uploaded `manifest.json` and confirm its SHA-384 matches the locally generated file before considering the deploy step successful
- [ ] 7.5 Add retry logic for the manifest upload step (3 attempts), reusing the workflow's existing retry conventions
- [ ] 7.6 Write unit tests for manifest upload logic (mocked `az` CLI calls)
- [ ] 7.7 Document that manifest.json lives at `mfes-<env>/manifest.json` on the same `tssmfestorage` account already provisioned by `azure-blob-deployment-pipeline` (no new infrastructure)

**Depends on**: `azure-blob-deployment-pipeline` task group 3 (unified MFE deploy workflow must exist and be merged)  
**Skill**: DevOps engineer or backend developer with cloud experience  
**Estimate**: 3-4 hours (reduced from 6-8h — no new provider abstraction needed)

---

## 8. Extend Existing GitHub Actions Pipeline for Manifest Updates

**Supersedes the original "author a new CI/CD pipeline" scope.** `.github/workflows/deploy-mfes.yml` already exists (authored and merged by `azure-blob-deployment-pipeline`, task 3.1) with Turborepo/git-diff change detection, matrix-based parallel deploy, OIDC auth, and versioned uploads. This group only adds an atomic manifest-update job to that existing workflow.

- [ ] 8.1 Add an `update-manifest` job to the existing `deploy-mfes.yml`, gated on `needs: [deploy-dev]` (or `deploy-prod`) so it only runs after **all** matrix MFEs in that run have deployed successfully
- [ ] 8.2 In `update-manifest`, run `scripts/generate-manifest.ts --env=<dev|prod>` to regenerate the manifest from the current state of the target container, then upload per task 7.2
- [ ] 8.3 Ensure the job SHALL NOT run (and SHALL NOT partially update the manifest) if any MFE in the matrix failed
- [ ] 8.4 Confirm SRI hash computation (already implemented in `scripts/generate-manifest.ts`, group 2) is included per MFE entry in the uploaded manifest
- [ ] 8.5 Add job-level failure notification reusing whatever notification mechanism (if any) `azure-blob-deployment-pipeline` already established; do not introduce a new Slack/Discord integration if none exists yet — flag as a follow-up instead
- [ ] 8.6 Confirm `workflow_dispatch` (already present on `deploy-mfes.yml`) covers manual manifest regeneration without requiring a new trigger
- [ ] 8.7 Test the extended workflow against a scratch branch/tag before merging
- [ ] 8.8 Document the manifest-update job in `docs/turborepo-deployment-optimization.md` or the workflow's own header comment — do not create a separate new CI/CD doc for what is an extension of an existing, documented workflow

**Depends on**: Section 2 (manifest generation), Section 3 (dual-format config generation), Section 7 (manifest upload), `azure-blob-deployment-pipeline` groups 1 and 3 (Azure infra + the workflow being extended)  
**Skill**: DevOps engineer  
**Estimate**: 3-4 hours (reduced from 8-10h — no new workflow file, no new triggers)

---

## 9. Azure Infrastructure Reuse Check (no new provisioning)

**Supersedes the original "CDN Infrastructure Setup" scope**, which assumed a from-scratch AWS S3/CloudFront or Cloudflare R2 bucket. That infrastructure already exists as Azure Blob Storage account `tssmfestorage`, provisioned by `azure-blob-deployment-pipeline` task group 1. This group is reduced to a verification checklist — no new account, container, domain, or credentials should be created.

- [ ] 9.1 Confirm account-level CORS (`GET`/`OPTIONS` from `*`, already configured per `azure-blob-deployment-pipeline` task 1.1) covers cross-origin `manifest.json` fetches from the shell's origin
- [ ] 9.2 Confirm Azure Blob Storage's built-in HTTPS termination and automatic content compression (where supported) are sufficient for `manifest.json`'s size; do not provision a separate CDN/custom domain for this MVP
- [ ] 9.3 Confirm `gha-mfe-dev`/`gha-mfe-prod` OIDC identities' existing `Storage Blob Data Contributor` container-level RBAC (scoped to `mfes-dev`/`mfes-prod` respectively) is sufficient to write `manifest.json` — no new role assignment needed since it's the same containers
- [ ] 9.4 Document in this change's design notes that Azure Front Door / Azure CDN fronting `tssmfestorage` remains a future, separate enhancement (see ADR-0009's named debt item A7) and is explicitly out of scope here

**Depends on**: None — pure verification against already-provisioned infrastructure  
**Owner**: architect, team-lead  
**Estimate**: 1 hour (reduced from 4-6h — no infrastructure to provision)

---

## 10. Rollback Tooling

- [ ] 10.1 Create `scripts/rollback-mfe.ts` script
- [ ] 10.2 Implement CLI to rollback MFE to a specific previously-deployed version
- [ ] 10.3 Fetch the current `manifest.json` from `mfes-prod` via `az storage blob download`
- [ ] 10.4 Update the manifest's entry for the target MFE to point back at the specified previous version's already-existing immutable path (`mfes-prod/<mfe-name>/v<previous-version>/remoteEntry.js` — this asset is never deleted, per `azure-blob-deployment-pipeline`'s immutability guarantee)
- [ ] 10.5 Re-upload the updated manifest per task 7.2
- [ ] 10.6 Add validation that the target version's blob prefix exists in `mfes-prod` (`az storage blob exists`) before allowing rollback
- [ ] 10.7 Create a GitHub Action (`workflow_dispatch` input for MFE name + version) for one-click rollback
- [ ] 10.8 Document the rollback procedure in `docs/runbooks/azure-blob-provisioning.md` or a new focused runbook, cross-linking ADR-0009
- [ ] 10.9 Test rollback against a real previously-deployed version in the dev container

**Depends on**: Sections 2, 7 (manifest generation, manifest upload)  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 4-5 hours

---

## 11. Manifest-Referenced Version Cleanup Script

- [ ] 11.1 Create `scripts/cleanup-cdn.ts` script targeting Azure Blob Storage (rename to `scripts/cleanup-mfe-versions.ts` if preferred, to drop the CDN-specific name)
- [ ] 11.2 Implement logic to list all versioned prefixes of each MFE via `az storage blob list --container-name mfes-prod --prefix <mfe-name>/v`
- [ ] 11.3 Determine N most recent versions to keep (default: 10)
- [ ] 11.4 Check if a version is referenced by the current `manifest.json` (or `remotes.config.prod.json`) before allowing deletion
- [ ] 11.5 Implement dry-run mode to preview deletions
- [ ] 11.6 Add CLI flags: `--keep`, `--keep-all`, `--dry-run`
- [ ] 11.7 Implement batch deletion via `az storage blob delete-batch` with progress reporting
- [ ] 11.8 Add a scheduled GitHub Action (`schedule:` trigger) for periodic cleanup, authenticated via the existing `gha-mfe-prod` OIDC identity
- [ ] 11.9 Document the cleanup policy, noting it operates on the same `mfes-prod` container `azure-blob-deployment-pipeline` provisioned

**Depends on**: Section 7 (manifest upload), `azure-blob-deployment-pipeline` task group 1 (containers must exist)  
**Skill**: DevOps engineer or backend developer  
**Estimate**: 3-4 hours

---

## 12. Testing & Validation

- [ ] 12.1 Write integration test for full deployment flow (local)
- [ ] 12.2 Test manifest generation with multiple MFEs
- [ ] 12.3 Test manifest fetching and parsing in shell
- [ ] 12.4 Test MFE loading from `tssmfestorage.blob.core.windows.net/mfes-<env>/...` URLs in shell
- [ ] 12.5 Test SRI hash verification (both valid and invalid)
- [ ] 12.6 Test manifest caching and expiration
- [ ] 12.7 Test manifest fetch failure fallback to cache
- [ ] 12.8 Test version pinning (load specific old version via manifest edit)
- [ ] 12.9 Test rollback procedure against the real dev container (`mfes-dev`)
- [ ] 12.10 Perform end-to-end dev deployment test using the extended `deploy-mfes.yml`
- [ ] 12.11 Load test manifest fetch against `tssmfestorage` with realistic traffic patterns; skip synthetic CDN load testing since there is no separate CDN layer in this MVP
- [ ] 12.12 Verify Azure Blob cache headers and immutability (`no-cache, must-revalidate` for dev/manifest; `public, max-age=31536000, immutable` for versioned MFE assets) match `azure-blob-deployment-pipeline`'s existing conventions

**Depends on**: All previous sections  
**Skill**: Use #file:~/.agents/skills/tester/SKILL.md  
**Estimate**: 8-10 hours

---

## 13. Monitoring & Observability

- [ ] 13.1 Add telemetry for manifest fetch success/failure rates
- [ ] 13.2 Add metrics for MFE load times from `tssmfestorage`
- [ ] 13.3 Add SRI hash mismatch error tracking
- [ ] 13.4 Use Azure Storage Analytics / Azure Monitor metrics for the `tssmfestorage` account (requests, egress) instead of a third-party CDN dashboard
- [ ] 13.5 Create a dashboard for deployment pipeline metrics (Azure Monitor workbook or equivalent)
- [ ] 13.6 Set up Azure Monitor alerts for manifest fetch failure spikes and for the existing activity-log delete-alert (per `azure-blob-deployment-pipeline` task 1.4) firing unexpectedly
- [ ] 13.7 Add logging for manifest updates in the extended `deploy-mfes.yml` job
- [ ] 13.8 Document monitoring setup, cross-linking `azure-blob-deployment-pipeline`'s provisioning runbook

**Depends on**: Section 12 (testing complete)  
**Owner**: DevOps/SRE team  
**Estimate**: 4-5 hours

---

## 14. Documentation & Training

- [ ] 14.1 Update main README.md with deployment architecture overview
- [ ] 14.2 Document manifest structure and schema in docs/MANIFEST.md
- [ ] 14.3 Create DEPLOYMENT.md guide for deploying MFEs
- [ ] 14.4 Create ROLLBACK.md runbook for emergency rollbacks
- [ ] 14.5 Document version bumping workflow in CONTRIBUTING.md
- [ ] 14.6 Add troubleshooting guide for common deployment issues
- [ ] 14.7 Create architecture diagram showing the manifest generation → Azure Blob upload → shell fetch flow, layered on top of `azure-blob-deployment-pipeline`'s existing diagram
- [ ] 14.8 Record demo video of deployment workflow
- [ ] 14.9 Conduct team training session on new deployment process
- [ ] 14.10 Update onboarding docs for new developers

**Depends on**: All previous sections  
**Skill**: Technical writer or team lead  
**Estimate**: 6-8 hours

---

## 15. Production Rollout

- [ ] 15.1 Merge the extended `deploy-mfes.yml` (manifest-update job) to main
- [ ] 15.2 Deploy first MFE (mfe-widget) and confirm `mfes-prod/manifest.json` updates correctly on `tssmfestorage`
- [ ] 15.3 Verify manifest content matches the deployed version and SRI hash
- [ ] 15.4 Deploy the shell application (once `azure-blob-deployment-pipeline` group 4's `deploy-website.yml` exists) with manifest fetching enabled behind a feature flag, alongside the existing `remotes.config.prod.json` path as fallback
- [ ] 15.5 Monitor manifest fetch success rate for first 24 hours
- [ ] 15.6 Monitor MFE load times and error rates from `tssmfestorage`
- [ ] 15.7 Verify rollback procedure works against the real prod container
- [ ] 15.8 Gradually onboard remaining MFEs to manifest-based loading
- [ ] 15.9 Remove the `remotes.config.prod.json`-based static fallback only after manifest-based loading is stable (do not remove the PR-based pinning workflow from `azure-blob-deployment-pipeline` until this migration is proven)
- [ ] 15.10 Conduct post-launch retrospective

**Depends on**: All previous sections, and `azure-blob-deployment-pipeline` task group 4 (shell deploy workflow must exist before the shell can be redeployed with manifest fetching)  
**Skill**: Team lead coordinating with DevOps and frontend teams  
**Estimate**: Full week (iterative rollout)

---

## Total Effort Estimate

- **Development**: ~50-63 hours (reduced — groups 7-9 no longer duplicate infrastructure/CI already shipped by `azure-blob-deployment-pipeline`)
- **Infrastructure**: ~1 hour (verification only — no new provisioning)
- **Testing**: ~8-10 hours
- **Documentation**: ~6-8 hours
- **Rollout**: ~20-30 hours

**Total**: ~85-112 hours (~2.5-3.5 weeks for a team of 2-3 developers)

**Note**: This estimate assumes `azure-blob-deployment-pipeline` (task groups 1, 3, and 4) is merged first. This change no longer provisions its own cloud infrastructure or its own CI/CD workflow — it strictly extends the Azure Blob Storage infrastructure and `deploy-mfes.yml` workflow that change already builds.
