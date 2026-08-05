## ADDED Requirements

### Requirement: JSON Schema is generated from the Zod schema

The monorepo SHALL provide a generation script that converts `appConfigSchema` into a standard JSON Schema document (`app-config.schema.json`) using a Zod-to-JSON-Schema conversion. The generated document SHALL include the `schemaVersion` constraint so external validators (ajv, K8s gates) enforce the same version match as the runtime parser.

#### Scenario: Generation produces a valid JSON Schema

- **WHEN** the generation script runs
- **THEN** it writes `app-config.schema.json` containing a draft-07-compatible (or later) JSON Schema with all required fields, formats, and the exact `schemaVersion` const

#### Scenario: ajv accepts what Zod accepts

- **WHEN** the same valid config document is validated with `parseAppConfig` and with ajv against the generated JSON Schema
- **THEN** both validators accept it; and for a document missing a required field, both validators reject it

### Requirement: Shell build artifact carries its config schema

The website shell build SHALL emit `app-config.schema.json` into `dist/` so every deployed shell artifact carries the exact config contract of the code it ships with. Because deployment pipelines upload the entire `dist/`, the schema SHALL become reachable at the artifact's public URL (Blob `dev` prefix now; immutable `v<semver>` release prefixes when the production release pipeline exists).

#### Scenario: Built dist contains the schema

- **WHEN** the website shell production build completes
- **THEN** `dist/app-config.schema.json` exists and its `schemaVersion` const equals the `@mfe-runtime/app-config` version built into the bundle

#### Scenario: Deployed dev shell serves its schema

- **WHEN** the shell dev deployment pipeline uploads `dist/` to the dev location
- **THEN** `app-config.schema.json` is retrievable from the deployed shell's base URL alongside `index.html`

### Requirement: Committed schema cannot drift from the Zod source

If a generated `app-config.schema.json` is committed to the repository, CI SHALL regenerate it and fail when the committed file differs from the freshly generated output.

#### Scenario: Drift fails CI

- **WHEN** a PR changes the Zod schema without regenerating the committed JSON Schema
- **THEN** the CI drift check fails with a diff instructing the author to re-run the generation script
