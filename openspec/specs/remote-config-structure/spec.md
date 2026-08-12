# remote-config-structure Specification

## Purpose

This specification defines the structure and validation capabilities of the @mfe-runtime/remote-config package. This package provides a JSON Schema (Draft 7) for remote micro-frontend configuration, TypeScript types matching the schema, and Ajv-based validation functions. The schema defines the structure of the generated remotes.config.json file that will be consumed by the dynamic loader.

## Requirements

### Requirement: Package structure exists

The system SHALL include a @mfe-runtime/remote-config package with JSON Schema and validation.

#### Scenario: Package directory exists

- **WHEN** filesystem is inspected
- **THEN** `packages/remote-config/` directory exists

#### Scenario: Package.json configured correctly

- **WHEN** `packages/remote-config/package.json` is read
- **THEN** name is `@mfe-runtime/remote-config`
- **AND** version is `0.1.0`
- **AND** dependencies include `ajv`
- **AND** exports include both types and schema.json

#### Scenario: TypeScript configured correctly

- **WHEN** `packages/remote-config/tsconfig.json` is inspected
- **THEN** strict mode is enabled
- **AND** target is ES2022 or higher

---

### Requirement: JSON Schema exists

The system SHALL define a JSON Schema (Draft 7) for remote configuration.

#### Scenario: Schema file exists

- **WHEN** `packages/remote-config/schema.json` is read
- **THEN** $schema is "http://json-schema.org/draft-07/schema#"
- **AND** it defines `remote` type in definitions
- **AND** root object has `remotes` array property

#### Scenario: Remote schema validates correctly

- **WHEN** schema definitions.remote is inspected
- **THEN** required fields include name, entryUrl, scope, version
- **AND** optional fields include fallbackUrls, enabled
- **AND** name matches pattern `^[a-z][a-z0-9-]*$`
- **AND** scope matches pattern `^[a-zA-Z][a-zA-Z0-9]*$`

---

### Requirement: TypeScript types match schema

The system SHALL provide TypeScript types matching the JSON Schema.

#### Scenario: Types file exists

- **WHEN** `packages/remote-config/src/types.ts` is read
- **THEN** it exports Remote interface
- **AND** it exports RemoteConfig interface

#### Scenario: Remote interface matches schema

- **WHEN** Remote interface is inspected
- **THEN** it includes name, entryUrl, scope, version (required)
- **AND** it includes fallbackUrls, enabled (optional)

---

### Requirement: Validation functions exist

The system SHALL provide Ajv-based validation for remote configuration.

#### Scenario: Validation module exists

- **WHEN** `packages/remote-config/src/validation.ts` is read
- **THEN** it exports validateRemoteConfig function
- **AND** it exports safeValidateRemoteConfig function

#### Scenario: Validation throws on invalid config

- **WHEN** validateRemoteConfig is called with invalid config
- **THEN** it throws Error with validation details

#### Scenario: Safe validation returns null on invalid config

- **WHEN** safeValidateRemoteConfig is called with invalid config
- **THEN** it returns null without throwing

---

### Requirement: Package builds successfully

The system SHALL build the remote-config package using vite-plus.

#### Scenario: Build produces output

- **WHEN** `pnpm build --filter @mfe-runtime/remote-config` is run
- **THEN** the command exits with code 0
- **AND** `dist/index.mjs` is created
- **AND** `dist/index.d.mts` is created
- **AND** `schema.json` remains in package root

#### Scenario: Schema is accessible via exports

- **WHEN** package.json exports is inspected
- **THEN** "./schema.json" maps to "./schema.json"
