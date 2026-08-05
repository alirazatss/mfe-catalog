# app-config-validation-tooling Specification

## Purpose

TBD - created by archiving change app-config-contract. Update Purpose after archive.

## Requirements

### Requirement: Portable CLI validates a config document against a schema

The monorepo SHALL provide a standalone validation script (`scripts/validate-app-config.ts`) that validates a config JSON document against an `app-config.schema.json`, where both the document and the schema MAY be given as local file paths or HTTP(S) URLs. The script SHALL exit non-zero on validation failure and print every violation with its field path. The script SHALL have no dependency on shell internals so it can be lifted unchanged into an external rollout repository (corporate GitHub/Kubernetes, later).

#### Scenario: Valid document passes

- **WHEN** the CLI is invoked with a schema path and a document that satisfies it
- **THEN** it exits 0 and prints a success confirmation including the schema's version

#### Scenario: Invalid document fails with field-level detail

- **WHEN** the CLI is invoked with a document missing a required field and carrying a wrong-typed field
- **THEN** it exits non-zero and prints both violations with their JSON paths

#### Scenario: Schema fetched by URL

- **WHEN** the CLI is invoked with an `https://` schema URL (e.g., a deployed shell artifact's schema)
- **THEN** it downloads the schema and validates the document against it, enabling version-pinned validation in external pipelines

### Requirement: CI validates the repo's own config documents

The repository's CI SHALL validate `apps/shells/website/public/app-config.json` against the freshly generated schema on every pull request, so schema/config skew introduced in this repo fails before merge.

#### Scenario: Skew introduced in a PR fails CI

- **WHEN** a PR adds a required field to the Zod schema without updating `app-config.json`
- **THEN** the CI validation step fails, identifying the missing field

#### Scenario: Consistent change passes CI

- **WHEN** a PR updates the schema and all config documents together
- **THEN** the CI validation step passes
