# config-generation Specification

## Purpose

This specification defines the config generation system that transforms discovered micro-frontend metadata into a validated RemoteConfig object. The system generates environment-specific URLs (localhost for development, CDN with versioning for production) and validates the output against JSON Schema before writing to disk.

## Requirements

### Requirement: Generate config from discovered micro-frontends

The system SHALL generate a valid RemoteConfig object from an array of MicroFrontend objects.

#### Scenario: Generate development config

- **WHEN** generateConfig is called with one MicroFrontend in development mode
- **THEN** config contains one remote entry
- **AND** entryUrl is `http://localhost:{port}/remoteEntry.js`
- **AND** scope matches MicroFrontend scope
- **AND** version matches MicroFrontend version

#### Scenario: Generate production config with git hash

- **WHEN** generateConfig is called in production mode with gitHash "abc123"
- **THEN** entryUrl includes `/v{gitHash}/`
- **AND** version field uses git hash instead of package version

#### Scenario: Multiple micro-frontends generate multiple remotes

- **WHEN** generateConfig receives array of 3 MicroFrontends
- **THEN** config.remotes array has 3 entries
- **AND** each entry has unique name

---

### Requirement: Support environment-specific URL generation

The system SHALL generate different entry URLs based on environment.

#### Scenario: Development URLs use localhost

- **WHEN** environment is "development" and MicroFrontend has port 5174
- **THEN** entryUrl is `http://localhost:5174/remoteEntry.js`

#### Scenario: Production URLs use base URL and versioning

- **WHEN** environment is "production" with baseUrl "https://cdn.example.com" and gitHash "abc123"
- **THEN** entryUrl is `https://cdn.example.com/mfe-{name}/vabc123/remoteEntry.js`

#### Scenario: Production defaults to latest when no git hash

- **WHEN** environment is "production" without gitHash
- **THEN** entryUrl includes `/vlatest/`

---

### Requirement: Validate generated config against JSON Schema

The system SHALL validate the generated config object before returning it.

#### Scenario: Valid config passes validation

- **WHEN** generated config conforms to schema
- **THEN** validation succeeds
- **AND** config is returned

#### Scenario: Invalid config throws error

- **WHEN** generated config violates schema (e.g., invalid URL format)
- **THEN** validation throws error
- **AND** error message explains validation failure

---

### Requirement: Include JSON Schema reference in config

The system SHALL add $schema field to generated config for IDE support.

#### Scenario: Schema reference included

- **WHEN** config is generated
- **THEN** config.$schema points to remote-config schema.json
- **AND** path is relative for local workspace resolution
