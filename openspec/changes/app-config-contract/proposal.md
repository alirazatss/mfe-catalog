## Why

The shell's runtime configuration (API base URLs, auth/Keycloak endpoints, logout URLs) is injected at deploy time — not build time — so a version pointer and its config form an implicit contract that nothing validates today. When the platform moves to per-customer Kubernetes deployments (corporate GitHub + K8s, planned), a ConfigMap that is missing a key the pinned shell version requires, or carries a stale/renamed shape, deploys "green" and only breaks in the customer's browser. The defense is a machine-readable config contract generated with every shell release, plus validation tooling that CI (now) and Kubernetes deploy gates (later) can run against any candidate config.

This change supersedes the not-started `environment-configuration` change: it delivers the same type-safe runtime config loading, but Zod-first with a generated JSON Schema contract, aligned with the Blob/CDN release model that emerged after the original proposal was written.

## What Changes

- **New package `@mfe-runtime/app-config`**: Zod schema as the single source of truth for the shell's runtime app configuration (`schemaVersion`, `apiBaseUrl`, `auth.*`, per-environment extensions). Exports the schema, the inferred `AppConfig` type, a `parseAppConfig` runtime validator, and an async `loadAppConfig` fetch-and-validate loader.
- **JSON Schema generation at build**: A generation script converts the Zod schema to `app-config.schema.json`. The shell build emits this file into `dist/`, so every deployed shell artifact (Blob `dev` now, `v<semver>` prod releases later) carries the exact contract of the code it ships with.
- **Shell boot validation**: The website shell fetches `/app-config.json` at bootstrap and validates it with the Zod schema baked into the bundle. Invalid or missing config renders a clear configuration-error screen instead of a mystery runtime crash.
- **Reusable config validation CLI**: A standalone script (`scripts/validate-app-config.ts`) validates any config JSON against any `app-config.schema.json` (local path or URL). Designed to be lifted into the corporate rollout repo's CI and K8s deploy gates unchanged.
- **CI validation in this repo**: The test workflow validates the repo's own `app-config.json` files (and drift between the generated schema and the committed one, if committed) so schema/config skew fails PRs here first.
- **ROADMAP: Kubernetes deploy-time validation**: Helm `pre-install`/`pre-upgrade` hook Job and/or initContainer validating the customer ConfigMap against the pinned shell version's published schema — documented as a roadmap item with the intended design, deferred until the corporate K8s settings are brought in.
- **Supersede `environment-configuration`**: the old change folder is marked superseded by this change.

## Capabilities

### New Capabilities

- `app-config-schema`: Zod-first app config schema package — schema definition, inferred types, runtime parse/load helpers, and semver-tracked `schemaVersion` discipline.
- `app-config-schema-artifact`: Generation and publication of `app-config.schema.json` as part of every shell build artifact (dist → Blob dev now, versioned releases later).
- `shell-config-boot-validation`: Shell bootstrap fetches and validates runtime app config, with an explicit config-error failure mode.
- `app-config-validation-tooling`: Portable CLI validation of a config document against a schema (file or URL), plus CI wiring in this repo.

### Modified Capabilities

<!-- none: shell-deployment-pipeline dist upload already copies all of dist/; no requirement change needed for the schema file to be published -->

## Impact

**Affected code**:

- `packages/app-config/` — new package (schema, types, loader, generation script)
- `apps/shells/website/src/shell/runtime-config.ts` / `main.ts` — bootstrap loads and validates app config before starting the runtime
- `apps/shells/website/public/app-config.json` — new dev/default config document served by the shell
- `apps/shells/website/vite.config.ts` or build script — emits `app-config.schema.json` into `dist/`
- `scripts/validate-app-config.ts` — new portable validator CLI
- `.github/workflows/test.yml` — CI step validating repo config documents against the generated schema
- `ROADMAP.md` — Kubernetes deploy-time validation section (Helm hook / initContainer / per-customer values files)
- `openspec/changes/environment-configuration/` — marked superseded

**Dependencies**: adds `zod` and `zod-to-json-schema` (catalog entries). `ajv` already present via `remote-config`.

**Breaking changes**: none. Additive; the shell falls back to a built-in default config in dev if `/app-config.json` is absent, mirroring the `FALLBACK_REMOTES` pattern.

**Risks**:

- Schema/`schemaVersion` discipline is manual until a lint/CI check enforces it — mitigated by CI drift check tasks.
- The K8s gate is deferred; until the corporate repo exists, prod-config skew protection is CI-only. Accepted: there are no per-customer prod deployments yet.
