# Design — app-config-contract

## Context

Runtime app config (API base URL, Keycloak/auth endpoints) is injected at deploy time, decoupled from the build. The target multi-tenant model (per-customer Kubernetes ConfigMaps pointing at immutable `v<semver>` shell releases on Azure Blob/CDN) makes the version↔config contract the primary skew risk: a ConfigMap missing a key the pinned shell needs deploys "green" and breaks only in the browser. Kubernetes cannot catch this natively — ConfigMaps are untyped and pods stay healthy.

The corporate GitHub/K8s environment does not exist yet. This change therefore builds everything K8s will consume later (schema artifact per release, portable validator) and defers the K8s-side gates to the roadmap.

## Goals

- One source of truth for the app-config shape, versioned with the shell code that consumes it.
- Every deployed shell artifact self-describes its config contract (`app-config.schema.json` next to `index.html`).
- Validation is runnable by anything: TS runtime (Zod), Node CLI (ajv), future CI in another repo, future K8s Job/initContainer.
- Fail loudly and early: PR → CI; deploy → (future) Helm gate; runtime → config-error screen.

## Non-Goals

- Kubernetes manifests, Helm charts, hook Jobs, initContainers — ROADMAP only (corporate settings arrive later).
- Per-customer values files / rollout repo structure — belongs to the corporate repo.
- Environment auto-detection from hostname (the old `environment-configuration` idea) — the config document itself is environment-specific; detection is unnecessary in the deploy-time-injection model.
- Migrating `remote-config` to Zod — its hand-written schema.json + ajv works; converge later if desired.

## Decisions

### D1: Zod-first, JSON Schema generated

The Zod schema in `packages/app-config` is authoritative. `zod-to-json-schema` derives `app-config.schema.json` at build time. Rationale: one definition drives the TS type, runtime validation, and the external contract; hand-written JSON Schema (the `remote-config` pattern) risks drift between type and schema.

Trade-off: two validators (Zod at runtime, ajv externally) must agree. Mitigated by a parity test validating the same fixtures through both.

### D2: `schemaVersion` as exact-match const

The document carries `schemaVersion`; the schema pins it with an exact literal/const. Exact match (not semver range) keeps the K8s-side check trivially expressible in plain JSON Schema — no custom semver logic in ajv or future gates. Version discipline: breaking shape change → major, additive optional → minor. The constant lives in the package and is asserted against `package.json` version in a unit test.

### D3: Schema ships inside `dist/`

The Vite build (or a `generate` step wired into the shell's build script) writes `app-config.schema.json` into `dist/`. Existing deploy pipelines upload `dist/` wholesale, so the schema lands at the artifact URL with zero pipeline changes — and automatically appears under `v<semver>` prefixes when the prod release pipeline (separate change) exists. External consumers fetch `https://<cdn>/shell/<version>/app-config.schema.json` to validate against the exact pinned version.

### D4: Portable validator as a self-contained script

`scripts/validate-app-config.ts` uses ajv + the generated JSON Schema, accepts file paths or URLs for both inputs, and imports nothing from shell internals. This is the artifact the corporate rollout repo lifts verbatim for its CI step (`validate rendered ConfigMap against pinned version's schema`) and its K8s hook image.

### D5: Boot-time behavior differs by mode

Dev: fetch failure → built-in fallback + console warning (developer convenience, mirrors `FALLBACK_REMOTES`). Prod: fetch failure or schema failure → configuration-error screen listing violating fields; MFEs never mount. Rationale: silent prod fallback would mask exactly the skew this change exists to expose.

### D6: Supersede `environment-configuration`

The old change's valuable ideas (config package, runtime loader, type safety) are delivered here; its hostname-based environment detection is obsolete under deploy-time injection. The old change folder gets a `SUPERSEDED.md` pointer rather than deletion, preserving history.

## Validation layers (defense in depth)

| Layer                                      | When                | Tool                                              | Status      |
| ------------------------------------------ | ------------------- | ------------------------------------------------- | ----------- |
| Type check                                 | develop             | TS via Zod inference                              | this change |
| Schema/doc drift + repo config validity    | PR (this repo)      | generation script + ajv CLI in test workflow      | this change |
| Customer values vs pinned version's schema | PR (corporate repo) | same CLI, schema fetched by pinned URL            | ROADMAP     |
| Deploy gate                                | helm upgrade        | pre-install/pre-upgrade hook Job or initContainer | ROADMAP     |
| Runtime                                    | shell boot          | `parseAppConfig` + error screen                   | this change |

## Kubernetes design intent (recorded for the ROADMAP entry)

When corporate K8s settings arrive:

1. **Helm pre-upgrade hook Job**: fetches `app-config.schema.json` for `{{ .Values.shellVersion }}` from the CDN, validates the rendered ConfigMap's `app-config.json` with the portable CLI, aborts the release on failure (old pods keep serving).
2. **Alternative/additional initContainer**: validates the mounted config before nginx starts; readiness never goes green on invalid config.
3. **One values file per customer** pins `shellVersion` + config atomically in a single PR, so version and config cannot skew independently in git.

## Risks

- **Validator disagreement (Zod vs ajv)**: parity fixture test in the package; keep schema features to the JSON-Schema-expressible subset (no Zod refinements without JSON Schema equivalents).
- **Manual schemaVersion discipline**: unit test pins constant↔package.json; drift CI check catches forgotten regeneration. A changeset-style automation is out of scope.
- **Fallback config rot in dev**: same known risk as `FALLBACK_REMOTES`; the CI validation of `public/app-config.json` also validates the fallback fixture.
