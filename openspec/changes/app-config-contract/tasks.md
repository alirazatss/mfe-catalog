# Tasks — app-config-contract

Requirement IDs reference the spec deltas in this change:

- ACS-1..4 = `app-config-schema` requirements (Zod source of truth; schemaVersion; parse helper; async loader)
- AAR-1..3 = `app-config-schema-artifact` requirements (JSON Schema generation; dist artifact; drift check)
- SBV-1..3 = `shell-config-boot-validation` requirements (boot validation; dev fallback; served document)
- AVT-1..2 = `app-config-validation-tooling` requirements (portable CLI; repo CI validation)

## 1. App-config package (schema, parser, loader, generation)

**Owns files:**

- `packages/app-config/**`
- `pnpm-workspace.yaml` (catalog entries for `zod`, `zod-to-json-schema`)

**Depends on:** none

- [x] 1.1 Scaffold `packages/app-config` (`@mfe-runtime/app-config`) matching the `remote-config` package layout: `vp pack` build, `vp test`, exports map including `./schema.json`. — ACS-1 — Skill: backend-developer
- [x] 1.2 Write failing unit tests for `appConfigSchema` / `parseAppConfig`: valid fixture parses; missing `apiBaseUrl` + malformed `auth.keycloakUrl` reports BOTH field paths; mismatched `schemaVersion` rejected with expected/actual in message. — ACS-1, ACS-2, ACS-3 — Skill: tester
- [x] 1.3 Implement the Zod schema (`schemaVersion` literal, `apiBaseUrl`, `logoutUrl`, `auth.{keycloakUrl,realm,clientId}`), export `appConfigSchema`, `AppConfig`, `schemaVersion` constant, and `parseAppConfig` returning a result type with all issues. Add a test asserting `schemaVersion` constant matches `package.json` version. — ACS-1, ACS-2, ACS-3 — Skill: backend-developer
- [x] 1.4 Write failing tests then implement `loadAppConfig(url, options?)`: success path; fetch-reject and non-OK categorized as load errors distinct from validation errors. — ACS-4 — Skill: backend-developer
- [x] 1.5 Implement the generation script (`packages/app-config/scripts/generate-schema.ts`) emitting `schema.json` via `zod-to-json-schema` with the `schemaVersion` const; wire into the package `build` script. — AAR-1 — Skill: backend-developer
- [x] 1.6 Add Zod↔ajv parity test: shared valid/invalid fixtures validated through both `parseAppConfig` and ajv against the generated schema, asserting identical accept/reject outcomes. — AAR-1 — Skill: tester

## 2. Shell boot validation and served config

**Owns files:**

- `apps/shells/website/src/shell/app-config.ts` (new)
- `apps/shells/website/src/shell/app-config.test.ts` (new)
- `apps/shells/website/src/shell/runtime-config.ts`
- `apps/shells/website/src/shell/runtime-config.test.ts`
- `apps/shells/website/src/main.ts`
- `apps/shells/website/public/app-config.json` (new)
- `apps/shells/website/vite.config.ts` (copy schema into dist)

**Depends on:** task group 1 (package published in workspace)

- [x] 2.1 Write failing tests: bootstrap with valid config starts runtime using config values; schema-invalid config renders configuration-error screen naming violating fields and mounts no MFEs. — SBV-1 — Skill: tester
- [x] 2.2 Implement boot-time load: fetch `/app-config.json` via `loadAppConfig` before `runtime.start()`; thread validated `AppConfig` into the shell runtime config; render config-error screen on failure (reuse/extend `critical-error` rendering). — SBV-1 — Skill: frontend-developer
- [x] 2.3 Implement mode-dependent failure handling with tests: dev fetch-failure → built-in fallback + console warning; prod fetch/schema failure → error screen, no fallback. — SBV-2 — Skill: frontend-developer
- [x] 2.4 Add `public/app-config.json` (dev/default document) and a built-in fallback fixture; test that both validate against `appConfigSchema`. — SBV-3 — Skill: frontend-developer
- [x] 2.5 Emit `app-config.schema.json` into the shell `dist/` during build (Vite plugin or build-script copy from the package); test/verify the built dist contains it with the bundled `schemaVersion`. — AAR-2 — Skill: frontend-developer

## 3. Portable validator CLI and CI wiring

**Owns files:**

- `scripts/validate-app-config.ts` (new)
- `.github/workflows/test.yml` (validation + drift steps)

**Depends on:** task group 1 (schema generation must exist)

- [x] 3.1 Write failing tests for the CLI (invoke via node, assert exit codes/output): valid doc → exit 0 + schema version echoed; invalid doc → non-zero + both violations with JSON paths. — AVT-1 — Skill: tester
- [x] 3.2 Implement `scripts/validate-app-config.ts` with ajv(+formats): accepts schema and document as file path or HTTP(S) URL; zero imports from shell/app internals. — AVT-1 — Skill: backend-developer
- [x] 3.3 Verify URL mode against a served schema (local static server in test or the deployed dev shell) — schema fetched by URL validates a local document. — AVT-1 — Skill: tester
- [x] 3.4 Add CI step to `test.yml`: regenerate schema, fail on diff vs committed `schema.json` (drift check), then validate `apps/shells/website/public/app-config.json` with the CLI. — AAR-3, AVT-2 — Skill: backend-developer
- [x] 3.5 Verify the dev deployment publishes the schema: after a dev shell deploy, `app-config.schema.json` is retrievable from the shell base URL (manual check or smoke assertion documented in the workflow summary). — AAR-2 — Skill: tester

## 4. Roadmap and supersession bookkeeping

**Owns files:**

- `ROADMAP.md`
- `openspec/changes/environment-configuration/SUPERSEDED.md` (new)

**Depends on:** none

- [x] 4.1 Add ROADMAP section "Kubernetes deploy-time config validation" recording the deferred design: Helm pre-install/pre-upgrade hook Job validating the rendered ConfigMap against the pinned `shellVersion`'s published schema; optional initContainer gate; one values file per customer pinning version + config atomically; corporate-repo CI step using `scripts/validate-app-config.ts` with the version-pinned schema URL. — design §Kubernetes design intent — Skill: team-lead
- [x] 4.2 Create `openspec/changes/environment-configuration/SUPERSEDED.md` pointing to `app-config-contract`, summarizing what carried over (config package, runtime loader, type safety) and what was dropped (hostname-based environment detection) with rationale. — proposal §What Changes — Skill: team-lead
- [x] 4.3 Update `ROADMAP.md` entry for the old `environment-configuration` change to reference the supersession. — proposal §What Changes — Skill: team-lead

## Execution waves

- Wave 1 (parallel): task groups 1, 4
- Wave 2 (parallel, after group 1 merges): task groups 2, 3

## Requirement coverage matrix

| Requirement                               | Covered by tasks |
| ----------------------------------------- | ---------------- |
| ACS-1 (Zod source of truth)               | 1.1, 1.2, 1.3    |
| ACS-2 (semver schemaVersion)              | 1.2, 1.3         |
| ACS-3 (parse helper, all errors)          | 1.2, 1.3         |
| ACS-4 (async loader categories)           | 1.4              |
| AAR-1 (JSON Schema generation + parity)   | 1.5, 1.6         |
| AAR-2 (dist carries schema; deployed URL) | 2.5, 3.5         |
| AAR-3 (drift check)                       | 3.4              |
| SBV-1 (boot validation + error screen)    | 2.1, 2.2         |
| SBV-2 (dev fallback / prod refusal)       | 2.3              |
| SBV-3 (served doc valid)                  | 2.4              |
| AVT-1 (portable CLI)                      | 3.1, 3.2, 3.3    |
| AVT-2 (repo CI validation)                | 3.4              |
