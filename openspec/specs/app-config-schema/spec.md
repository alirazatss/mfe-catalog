# app-config-schema Specification

## Purpose

TBD - created by archiving change app-config-contract. Update Purpose after archive.

## Requirements

### Requirement: Zod schema is the single source of truth for app config

The `@mfe-runtime/app-config` package SHALL define the shell's runtime application configuration contract as a Zod schema, and SHALL export the schema object, the inferred TypeScript type `AppConfig`, and a `schemaVersion` constant. No other definition of the app-config shape SHALL exist in the monorepo.

#### Scenario: Schema exports are available to consumers

- **WHEN** a workspace package imports `@mfe-runtime/app-config`
- **THEN** it can access `appConfigSchema` (Zod schema), the `AppConfig` inferred type, and the current `schemaVersion` string

#### Scenario: Config shape and type stay in sync automatically

- **WHEN** a field is added to or removed from `appConfigSchema`
- **THEN** the `AppConfig` type reflects the change without any manual type edits, and TypeScript compilation fails for consumers using the removed field

### Requirement: App config document declares a semver schemaVersion

The app-config document SHALL carry a `schemaVersion` field following semver, and the schema SHALL only accept documents whose `schemaVersion` matches the schema's own version exactly. The package version discipline SHALL be: breaking config-shape changes bump major, additive optional fields bump minor.

#### Scenario: Matching schemaVersion is accepted

- **WHEN** a config document with `schemaVersion` equal to the schema's version and all required fields is parsed
- **THEN** parsing succeeds and returns a typed `AppConfig` value

#### Scenario: Mismatched schemaVersion is rejected

- **WHEN** a config document with a different `schemaVersion` is parsed
- **THEN** parsing fails with an error identifying the expected and actual schema versions

### Requirement: Runtime parse helper reports actionable errors

The package SHALL export a `parseAppConfig(input: unknown)` function that validates arbitrary input against the schema and, on failure, produces an error result listing every violating field path with a human-readable message (not only the first failure).

#### Scenario: Valid input parses to typed config

- **WHEN** `parseAppConfig` receives an object satisfying the schema
- **THEN** it returns a success result containing the typed `AppConfig`

#### Scenario: Invalid input reports all field errors

- **WHEN** `parseAppConfig` receives an object missing `apiBaseUrl` and carrying a non-URL `auth.keycloakUrl`
- **THEN** it returns a failure result whose error lists both field paths with distinct messages

### Requirement: Async loader fetches and validates config from a URL

The package SHALL export a `loadAppConfig(url, options?)` function that fetches a JSON document and validates it via `parseAppConfig`. Fetch failures, non-OK responses, JSON parse failures, and schema failures SHALL each surface as distinguishable error categories.

#### Scenario: Successful load

- **WHEN** `loadAppConfig` fetches a URL that returns valid config JSON
- **THEN** it resolves with the typed `AppConfig`

#### Scenario: Network or HTTP failure is distinguishable from schema failure

- **WHEN** the fetch rejects or the response status is not OK
- **THEN** the resulting error is categorized as a load error, distinct from the validation error produced for schema-invalid JSON
