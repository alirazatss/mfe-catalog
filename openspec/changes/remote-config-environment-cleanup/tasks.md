# Tasks: remote-config-environment-cleanup

Requirement IDs used below:

- **ESRC-1** — env config files live in `config/`, none under `public/` (environment-specific-remote-config, MODIFIED)
- **ESRC-2** — build emits exactly one manifest selected by `DEPLOY_ENV` (environment-specific-remote-config, ADDED)
- **ESRC-3** — dev server serves gitignored local override with dev-config fallback (environment-specific-remote-config, ADDED)
- **CG-1** — environment mode `local` replaces `development`, old name rejected with guidance (config-generation, MODIFIED)
- **CG-2** — generator honors shell's root MFE designation (config-generation, ADDED)
- **CG-3** — generator produces the local override manifest incl. dry-run (config-generation, ADDED)
- **TSB-1** — shell has no baked-in fallback remotes; manifest fetch failure renders critical-error UI only (thin-shell-bootstrap, MODIFIED)

## 1. Shell env config relocation & local override serving

**Owns files:**

- `apps/shells/website/vite.config.ts`
- `apps/shells/website/config/remotes.config.dev.json` (moved)
- `apps/shells/website/config/remotes.config.prod.json` (moved)
- `apps/shells/website/public/remotes.config.json` (deleted)
- `apps/shells/website/public/remotes.config.dev.json` (deleted)
- `apps/shells/website/public/remotes.config.prod.json` (deleted)
- `.gitignore`
- `.github/workflows/**` (path updates for `remotes.config.prod.json` references only)
- `GETTING_STARTED.md`

**Depends on:** none

- [x] 1.1 Write build tests first: default build emits `dist/remotes.config.json` identical to the dev config and no other `remotes.config*.json`; `DEPLOY_ENV=prod` emits prod content; unknown `DEPLOY_ENV` fails naming the missing file. (ESRC-2) — skills: tester, frontend-developer
- [x] 1.2 Move `remotes.config.dev.json` / `remotes.config.prod.json` from `public/` to `config/`; rewrite `copy-env-remote-config` plugin to copy the selected file only (no deletion list). (ESRC-1, ESRC-2) — skill: frontend-developer
- [x] 1.3 Delete committed `public/remotes.config.json`; update `serve-local-remote-config` middleware to fall back to `config/remotes.config.dev.json` when `remotes.config.local.json` is absent, keeping the local-override-active log line. (ESRC-1, ESRC-3) — skill: frontend-developer
- [x] 1.4 Add middleware tests: local file present → served; absent → dev config served; assert `git check-ignore` passes for `apps/shells/website/remotes.config.local.json`. (ESRC-3) — skill: tester
- [x] 1.5 Grep repo (`.github/workflows`, scripts, docs) for `public/remotes.config` and update paths to `config/`; note the pending `azure-blob-deployment-pipeline` change delta that references the old prod path. (ESRC-1) — skill: frontend-developer
- [x] 1.6 Update `GETTING_STARTED.md` local-testing section: generate the local override via the generator, never edit env configs for local testing. (ESRC-3) — skill: frontend-developer

Verification: `vp test` for the shell package; manual `pnpm run dev` smoke check that `/remotes.config.json` resolves both with and without the local file.

## 2. Config generator: local mode, root MFE, local override output

**Owns files:**

- `packages/monorepo-tools/src/config-generator.ts`
- `packages/monorepo-tools/src/**/*.test.ts` (generator tests)
- `scripts/generate-config.ts`
- `docs/manifest-generator.md`

**Depends on:** none

- [x] 2.1 Write tests first: environment `local` yields `http://localhost:{port}/remoteEntry.js`; environment `development` throws with a message directing to `local`. (CG-1) — skills: tester, backend-developer
- [x] 2.2 Implement the `development` → `local` rename with the guided rejection; update all internal call sites and CLI flag docs. (CG-1) — skill: backend-developer
- [x] 2.3 Write tests then implement root MFE designation: designated MFE's route key becomes `"/"`, others keep default base paths, unknown designation throws naming the MFE. (CG-2) — skills: tester, backend-developer
- [x] 2.4 Wire `scripts/generate-config.ts` to write `apps/shells/website/remotes.config.local.json` for `--environment local` (schema-validated, ports from the local port map) and support `--dry-run` printing without writing. (CG-3) — skill: backend-developer
- [x] 2.5 Update `docs/manifest-generator.md`: `local` mode semantics, root MFE designation, local override workflow. (CG-1, CG-2, CG-3) — skill: backend-developer

Verification: `vp test` for `packages/monorepo-tools`; `pnpm exec tsx scripts/generate-config.ts --environment local --dry-run` prints a schema-valid config.

## 3. Remove baked-in fallback remotes (fail visible)

**Owns files:**

- `apps/shells/website/src/config/remotes.ts` (deleted)
- `apps/shells/website/src/shell/manifest.ts`
- `apps/shells/website/src/shell/runtime-config.ts`
- `apps/shells/website/src/shell/manifest.test.ts`
- `turbo/generators/templates/shell/src/config/remotes.ts` (deleted)
- `turbo/generators/templates/shell/src/shell/manifest.ts`
- `turbo/generators/templates/shell/src/shell/runtime-config.ts.hbs`

**Depends on:** none

- [x] 3.1 Rewrite `manifest.test.ts` first: fetch failure after retries rejects (no `FALLBACK_REMOTES` equality assertions); bootstrap failure path renders the critical-error template and mounts no MFE. (TSB-1) — skill: tester
- [x] 3.2 Delete `src/config/remotes.ts`; remove `FALLBACK_REMOTES` imports/uses in `manifest.ts` and `runtime-config.ts` so fetch failure propagates to the existing critical-error UI. (TSB-1) — skill: frontend-developer
- [x] 3.3 Apply the same removal to the shell generator templates under `turbo/generators/templates/shell/` so new shells scaffold without the fallback. (TSB-1) — skill: frontend-developer
- [x] 3.4 Add an integration test: manifest endpoint returning 500 → error UI visible via stable selector, zero remotes requested from baked-in URLs. (TSB-1) — skill: tester

Verification: `vp test` for the shell; runtime integration suite passes with the fetch-failure scenario.

## 4. ADRs and glossary consistency

**Owns files:**

- `docs/adr/0011-per-customer-demo-deployments.md` (new)
- `docs/adr/0006-graceful-failure-handling.md` (amendment note)
- `CONTEXT.md` (consistency pass only)

**Depends on:** none

- [x] 4.1 Write ADR-0011: per-customer demo deployments — config overlays over branches; standing parallel deployments reusing the preview pattern; overlays pin versioned immutable artifacts (never `sha-*`/`pr-*`, which expire per ADR-0010); app-config overlay is the flag source of truth, k8s env vars are transport; short-lived branch only for contractual exclusivity, retired after use. — skill: architect
- [x] 4.2 Amend ADR-0006 with a dated note: graceful degradation is per-MFE; whole-manifest substitution (`FALLBACK_REMOTES`) removed as a latent prod-loads-dev incident; link this change. — skill: architect
- [x] 4.3 Consistency pass over `CONTEXT.md` glossary (local vs dev, demo tier family) against ADR-0011 wording; fix drift only, no new terms. — skill: architect

Verification: ADRs cross-link correctly; no glossary/ADR contradiction on the terms `local`, `dev`, `demo`.

## Execution waves

- Wave 1 (parallel): task groups 1, 2, 3, 4

## Requirement coverage matrix

| Requirement | Covered by tasks   |
| ----------- | ------------------ |
| ESRC-1      | 1.2, 1.3, 1.5      |
| ESRC-2      | 1.1, 1.2           |
| ESRC-3      | 1.3, 1.4, 1.6      |
| CG-1        | 2.1, 2.2, 2.5      |
| CG-2        | 2.3, 2.5           |
| CG-3        | 2.4, 2.5           |
| TSB-1       | 3.1, 3.2, 3.3, 3.4 |
