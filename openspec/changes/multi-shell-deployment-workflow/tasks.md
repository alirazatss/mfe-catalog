# Tasks: Multi-Shell Deployment Workflow

## 1. Extract reusable deploy workflow (pure refactor)

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-shell.yml`, `.github/workflows/deploy-website.yml`
Depends on: —

- [x] 1.1 Create `.github/workflows/deploy-shell.yml` with `on: workflow_call` and inputs `shell-name`, `shell-path`, `package-name`, `tag-prefix` (reusable-shell-deploy-workflow: reusable workflow requirement)
- [x] 1.2 Move version-validation job into the reusable workflow, deriving expected tag from `tag-prefix` and version from `<shell-path>/package.json` (tag validation requirement)
- [x] 1.3 Move dev deploy job (build, floating upload, conditional `sha-<short8>/` upload, `build-info.json`) into the reusable workflow, parameterized by inputs; keep current root destination for this wave
- [x] 1.4 Move prod config-only deploy job into the reusable workflow
- [x] 1.5 Key concurrency group as `deploy-<shell-name>-<env>` with `cancel-in-progress: false` for dev (per-shell concurrency requirement)
- [x] 1.6 Rewrite `deploy-website.yml` as a thin caller: triggers (paths `apps/shells/website/**`, tags `website-v*`) + `uses: ./.github/workflows/deploy-shell.yml` with inputs and `secrets: inherit` (thin caller requirement)
- [x] 1.7 Verify a dev deploy run through the caller produces output equivalent to the pre-refactor workflow (compare uploaded paths and `build-info.json`)

## 2. Blob layout migration to per-shell prefixes (BREAKING)

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-shell.yml` (destination logic only, after group 1 completes), `docs/runbooks/azure-blob-provisioning.md`, `scripts/azure/**` (migration helper)
Depends on: Group 1

- [ ] 2.1 Change reusable workflow destinations to `dev-shell/<shell-name>/`, `dev-shell/<shell-name>/sha-<short8>/`, and `$web/<shell-name>/` (shell-deployment-pipeline MODIFIED requirements; $web prefix requirement)
- [ ] 2.2 Add temporary dual-publish to the `dev-shell` root for the grace period (migration requirement, grace-period scenario)
- [ ] 2.3 Update the Azure lifecycle policy rules to match nested `dev-shell/<shell-name>/pr-` and `.../sha-` prefixes without matching floating blobs (azure-blob-storage-layout lifecycle requirement); document in the provisioning runbook
- [ ] 2.4 Audit `$web` and `dev-shell` root blobs for external consumers; record findings in the runbook (design open question)
- [ ] 2.5 After grace period: remove dual-publish and delete root shell blobs; verify no shell blob remains at either container root (stale-root scenario)

## 3. Multi-shell preview and cleanup workflows

Owner skill: backend-developer
Owns files: `.github/workflows/deploy-previews.yml`, `.github/workflows/cleanup-previews.yml`, `scripts/azure/generate-preview-config.ts`
Depends on: Group 2 (prefixed destinations must exist)

- [ ] 3.1 Extend change detection in `deploy-previews.yml` to detect affected shells across `apps/shells/*` via the Turborepo filter, producing a shell matrix (multi-shell preview requirement)
- [ ] 3.2 Parameterize the preview-shell job by shell: build the affected shell and upload to `dev-shell/<shell-name>/pr-<n>/`; skip unaffected shells
- [ ] 3.3 Update sticky-comment generation to list every deployed preview shell URL with its shell prefix (metadata/comment requirement)
- [ ] 3.4 Update `cleanup-previews.yml` to delete `dev-shell/<shell-name>/pr-<n>/` for every shell directory found, tolerating shells with no preview (cleanup requirements)
- [ ] 3.5 Verify with a test PR: preview lands under the shell prefix, comment URL resolves, close deletes only that PR's prefixed blobs

## 4. De-hardcode monorepo tooling

Owner skill: backend-developer
Owns files: `turbo.json`, `scripts/generate-config.ts`, `scripts/check-shell-size.ts`, `scripts/assert-package-test-scripts.ts`, `scripts/test-integration.ts`, `scripts/validate-app-config.ts`, `apps/shells/website/package.json` (prebuild args)
Depends on: —

- [x] 4.1 Change `turbo.json` `generate:config` outputs to the glob `apps/shells/*/public/remotes.config.json`; verify caching with `turbo build --dry-run=json` (config-generation requirement)
- [x] 4.2 Parameterize `scripts/generate-config.ts` to accept the target shell; update the website `prebuild` invocation (per-shell config scenario)
- [x] 4.3 Parameterize `scripts/check-shell-size.ts` with a shell argument defaulting to all `apps/shells/*` (size-check scenarios)
- [x] 4.4 Parameterize `scripts/assert-package-test-scripts.ts`, `scripts/test-integration.ts`, and `scripts/validate-app-config.ts` to iterate `apps/shells/*` by default (all-shells default scenario)
- [x] 4.5 Run the full validation suite (`vp check`, `vp test`, affected scripts) against the single existing shell to confirm no behavior change

## 5. E2E parameterization and documentation

Owner skill: tester
Owns files: `tests/e2e/playwright.config.ts`, `docs/PRODUCTION_DEPLOYMENT.md`, `README.md`, `GETTING_STARTED.md`
Depends on: Group 4

- [ ] 5.1 Resolve the Playwright `webServer` shell directory from `E2E_SHELL_DIR`, defaulting to `apps/shells/website` (E2E requirements, both scenarios)
- [ ] 5.2 Run the E2E suite without `E2E_SHELL_DIR` and confirm identical behavior to before
- [ ] 5.3 Document the "add a new shell" procedure (scaffold + caller workflow + inputs) and the new prefixed URLs in deployment docs
- [ ] 5.4 Update README/GETTING_STARTED references to `dev-shell` root URLs with the `dev-shell/website/` prefix

## Execution waves

- **Wave 1 (parallel):** Group 1, Group 4 — no shared files, no dependencies.
- **Wave 2:** Group 2 (needs Group 1's reusable workflow).
- **Wave 3 (parallel):** Group 3 (needs Group 2), Group 5 (needs Group 4).
