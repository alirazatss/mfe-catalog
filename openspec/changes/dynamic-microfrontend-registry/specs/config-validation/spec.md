# config-validation Specification

## Purpose

Provides client-side runtime validation of remote configurations to catch errors early and provide helpful diagnostics when configs are malformed or incomplete.

## ADDED Requirements

### Requirement: System SHALL validate config on load

The system SHALL validate fetched config against schema before attempting to use it.

#### Scenario: Valid config passes validation

- **WHEN** loader fetches config with all required fields and valid types
- **THEN** validation SHALL return success
- **AND** config SHALL be marked as valid and ready for use

#### Scenario: Invalid config returns errors

- **WHEN** loader fetches config with missing required fields or invalid types
- **THEN** validation SHALL return array of error messages
- **AND** config SHALL NOT be used for loading remotes
- **AND** system SHALL fall back to static configuration

#### Scenario: Validation errors logged to console

- **WHEN** validation fails with multiple errors
- **THEN** each error SHALL be logged to console.error with context
- **AND** error messages SHALL include field path (e.g., "remotes[0].entryUrl")

### Requirement: System SHALL provide helpful error messages

The system SHALL generate user-friendly error messages that help developers fix configuration issues.

#### Scenario: Missing field error includes expected type

- **WHEN** validation fails for missing `entryUrl` field
- **THEN** error message SHALL be: "Remote 'widgetA' missing required field 'entryUrl' (expected: string URL)"

#### Scenario: Type mismatch error shows actual and expected types

- **WHEN** validation fails because `enabled` field is string instead of boolean
- **THEN** error message SHALL be: "Remote 'widgetA' field 'enabled' has incorrect type (expected: boolean, got: string)"

#### Scenario: Invalid URL error shows problematic value

- **WHEN** validation fails for malformed URL
- **THEN** error message SHALL be: "Remote 'widgetA' field 'entryUrl' is not a valid URL: '{actualValue}'"

### Requirement: System SHALL validate required fields presence

The system SHALL check that all required fields exist before validating their values.

#### Scenario: Name field presence checked

- **WHEN** remote config lacks `name` field
- **THEN** validation SHALL fail with error "Remote at index {i} missing required field 'name'"

#### Scenario: EntryUrl field presence checked

- **WHEN** remote config lacks `entryUrl` field
- **THEN** validation SHALL fail with error "Remote '{name}' missing required field 'entryUrl'"

### Requirement: System SHALL validate field types

The system SHALL verify each field has the correct JavaScript type.

#### Scenario: String fields validated

- **WHEN** remote config has `name` or `entryUrl` as non-string
- **THEN** validation SHALL fail with type mismatch error

#### Scenario: Boolean fields validated

- **WHEN** remote config has `enabled` as non-boolean (e.g., "true", 1, null)
- **THEN** validation SHALL fail with type mismatch error

#### Scenario: Number fields validated

- **WHEN** remote config has `priority` as non-number (e.g., "10", null)
- **THEN** validation SHALL fail with type mismatch error

#### Scenario: Array fields validated

- **WHEN** remote config has `fallbackUrls` as non-array (e.g., string, object)
- **THEN** validation SHALL fail with error "Remote '{name}' field 'fallbackUrls' must be array"

#### Scenario: Array element types validated

- **WHEN** `fallbackUrls` array contains non-string element
- **THEN** validation SHALL fail with error "Remote '{name}' fallbackUrls[{i}] must be string URL"

### Requirement: System SHALL validate URL format

The system SHALL verify URLs are properly formatted and use allowed protocols.

#### Scenario: Valid HTTPS URL accepted

- **WHEN** entryUrl is "https://cdn.example.com/remote/entry.js"
- **THEN** validation SHALL pass for URL format

#### Scenario: Valid HTTP localhost URL accepted

- **WHEN** entryUrl is "http://localhost:5174/assets/remoteEntry.js"
- **THEN** validation SHALL pass for URL format

#### Scenario: Malformed URL rejected

- **WHEN** entryUrl is "not-a-url" or "htp://example.com"
- **THEN** validation SHALL fail with error "Remote '{name}' entryUrl is not a valid URL"

#### Scenario: Unsupported protocol rejected

- **WHEN** entryUrl uses ftp, file, or custom protocol
- **THEN** validation SHALL fail with error "Remote '{name}' entryUrl must use http or https protocol (got: {protocol})"

#### Scenario: Relative URL rejected

- **WHEN** entryUrl is relative path like "./entry.js" or "/assets/entry.js"
- **THEN** validation SHALL fail with error "Remote '{name}' entryUrl must be absolute URL with protocol and domain"

### Requirement: System SHALL detect duplicate remote names

The system SHALL prevent multiple remotes with the same name in a single config.

#### Scenario: Duplicate names detected

- **WHEN** config has two remotes both named "widgetA"
- **THEN** validation SHALL fail with error "Duplicate remote name 'widgetA' found at indices {i} and {j}"

#### Scenario: Unique names pass validation

- **WHEN** all remotes have unique names
- **THEN** validation SHALL pass duplicate check

### Requirement: System SHALL validate against JSON Schema

The system SHALL use JSON Schema validator for comprehensive validation.

#### Scenario: Config validated with JSON Schema

- **WHEN** system validates config
- **THEN** system SHALL use JSON Schema from `packages/remote-config/schema.json`
- **AND** validation SHALL use standard JSON Schema Draft 7 or later

#### Scenario: Schema validation errors formatted

- **WHEN** JSON Schema validation fails
- **THEN** errors SHALL be transformed to user-friendly format
- **AND** JSON pointer paths (e.g., "/remotes/0/entryUrl") SHALL be converted to readable paths (e.g., "remotes[0].entryUrl")

### Requirement: System SHALL support validation in development tools

The system SHALL provide standalone validation function for CI/CD and development workflows.

#### Scenario: Validation function exported

- **WHEN** developer imports `validateRemoteConfig` from package
- **THEN** function SHALL accept config object and return validation result
- **AND** result SHALL include `isValid: boolean` and `errors: string[]`

Example usage:

```typescript
import { validateRemoteConfig } from "@yourorg/remote-config";

const result = validateRemoteConfig(config);
if (!result.isValid) {
  console.error("Config validation failed:", result.errors);
}
```

#### Scenario: CLI validation tool available

- **WHEN** developer runs `npx validate-remote-config remotes.config.json`
- **THEN** CLI SHALL validate file and exit with code 0 if valid, 1 if invalid
- **AND** invalid configs SHALL print errors to stderr

### Requirement: System SHALL validate in strict and loose modes

The system SHALL support strict mode (fail on warnings) and loose mode (only fail on errors).

#### Scenario: Strict mode fails on warnings

- **WHEN** validation runs in strict mode with config containing non-HTTPS URL in production
- **THEN** validation SHALL fail
- **AND** error SHALL indicate security warning promoted to error

#### Scenario: Loose mode allows warnings

- **WHEN** validation runs in loose mode (default) with config containing warnings
- **THEN** validation SHALL pass
- **AND** warnings SHALL be logged to console.warn

#### Scenario: Mode configured via option

- **WHEN** calling `validateRemoteConfig(config, { strict: true })`
- **THEN** validation SHALL use strict mode

### Requirement: System SHALL cache validation results

The system SHALL avoid re-validating the same config multiple times.

#### Scenario: Valid config cached

- **WHEN** config is validated successfully
- **THEN** validation result SHALL be cached
- **AND** subsequent validations of same config object SHALL return cached result

#### Scenario: Config modification invalidates cache

- **WHEN** config object is modified after validation
- **THEN** cache SHALL be invalidated
- **AND** next validation SHALL re-run checks

### Requirement: System SHALL provide TypeScript type guards

The system SHALL export type guard functions for runtime type safety.

#### Scenario: Type guard for valid config

- **WHEN** developer uses `isValidRemoteConfig(config)` type guard
- **THEN** TypeScript SHALL narrow type to `RemoteConfig` if guard returns true
- **AND** config SHALL be type-safe to use

Example:

```typescript
import { isValidRemoteConfig, RemoteConfig } from "@yourorg/remote-config";

const config = await fetchConfig();
if (isValidRemoteConfig(config)) {
  // config is now typed as RemoteConfig
  config.remotes.forEach((remote) => {
    console.log(remote.name); // type-safe access
  });
}
```
