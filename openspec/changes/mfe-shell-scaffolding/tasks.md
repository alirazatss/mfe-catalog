# Tasks: mfe-shell-scaffolding

## 1. Generator foundation and MFE generator

Owner skill: backend-developer
Owns files: root `package.json`, `pnpm-workspace.yaml` (catalog entry), `turbo/generators/config.ts`, `turbo/generators/templates/mfe/**`, `turbo/generators/lib/**` (shared actions: name validation, port assignment, summary)
Depends on: nothing

- [ ] 1.1 Add `@turbo/gen` (catalog-pinned) and a root `gen` script; scaffold `turbo/generators/config.ts` with the `mfe` generator: name prompt, `^[a-z][a-z0-9-]*$` validation, collision check (app-scaffolding: MFE generator requirement)
- [ ] 1.2 Create the MFE template from `mfe-widget` anatomy, minimized: lifecycle `bootstrap.ts`, standalone `main.ts` + `index.html`, `App.tsx`, vite/vitest/tsconfig, test setup, starter test, README (app-scaffolding: MFE generator requirement, lifecycle scenario)
- [ ] 1.3 Implement port assignment via `discoverMicroFrontends()` — lowest free port ≥ 5174 written to `server.port`, `server.origin`, `preview.port` (app-scaffolding: port assignment requirement)
- [ ] 1.4 Implement the run-summary action listing created/modified files and manual follow-ups (app-scaffolding: run summary scenario)
- [ ] 1.5 Verify: scaffold `mfe-scratch`, run filtered build/test/typecheck green, then delete it (app-scaffolding: builds-green scenario)

## 2. MFE auto-wiring

Owner skill: backend-developer
Owns files: `turbo/generators/lib/wire-mfe.ts`, `.github/workflows/cleanup-previews.yml` (marker comments + list region)
Depends on: Group 1

- [ ] 2.1 Add `# scaffold:mfe-list:start/end` and `# scaffold:shell-list:start/end` markers around the fallback lists in `cleanup-previews.yml` (design D3)
- [ ] 2.2 Implement config wiring: insert the new MFE entry (dev localhost URL, prod blob URL pattern, scope, base path, version) into `remotes.config.{dev,prod}.json` of every shell under `apps/shells/*`; validate patched files against the manifest schema (app-scaffolding: auto-wire requirement, shell-configs scenario)
- [ ] 2.3 Implement idempotent marker-region patching of the MFE fallback list; fail with instructions if markers are missing (app-scaffolding: cleanup-list scenario, design D3)
- [ ] 2.4 Unit tests for wiring: entry shape, schema validity, idempotency, missing-marker failure (app-scaffolding: auto-wire scenarios)

## 3. Shell generator

Owner skill: backend-developer
Owns files: `turbo/generators/templates/shell/**`, `turbo/generators/lib/wire-shell.ts`, shell generator section of `turbo/generators/config.ts` is shared with Group 1 — extend, do not restructure
Depends on: Group 1, Group 2 (shell fallback-list marker)

- [ ] 3.1 Create the shell template from `website` anatomy: thin-shell `main.ts` boot, slots + layout, `app-config.json`, `remotes.config.{dev,prod}.json` pre-populated from discovered MFEs, `generate:config`/`check:size` scripts, vite/vitest/tsconfig (app-scaffolding: shell generator requirement)
- [ ] 3.2 Create the caller-workflow template `deploy-<name>.yml.hbs` matching `deploy-website.yml`: `main`/`release-*`/`<name>-v*` triggers, shell-scoped path filters, `compute-channel` job, reusable-workflow call with `shell-name`/`shell-path`/`package-name`/`tag-prefix` (app-scaffolding: thin-caller scenario)
- [ ] 3.3 Wire the shell into the `cleanup-previews.yml` shell fallback list via the marker region (app-scaffolding: shell generator requirement)
- [ ] 3.4 Verify: scaffold `scratch` shell, filtered build/test/typecheck green, `check-shell-size.ts scratch` passes, workflow file parses (actionlint), then delete it (app-scaffolding: budget and thin-caller scenarios)

## 4. Drift guard CI

Owner skill: tester
Owns files: `.github/workflows/scaffold-check.yml`
Depends on: Group 3

- [ ] 4.1 Create `scaffold-check.yml`: path-filtered to `turbo/generators/**` and itself; runs `turbo gen` non-interactively for a throwaway MFE and shell, then install + typecheck + build + test filtered to both (app-scaffolding: drift guard requirement)
- [ ] 4.2 Assert failure propagation: a seeded template type error must fail the job at typecheck (verified once locally via `act` or a draft PR) (app-scaffolding: regression scenario)
- [ ] 4.3 Confirm the workflow does not trigger on app-only changes (app-scaffolding: relevant-changes scenario)

## Execution waves

- Wave 1: Group 1
- Wave 2: Group 2
- Wave 3: Group 3
- Wave 4: Group 4

(Sequential by necessity: wiring needs the generator foundation, the shell generator reuses MFE wiring pieces and markers, the guard exercises both generators.)
