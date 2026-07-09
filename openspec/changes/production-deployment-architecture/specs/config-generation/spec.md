## MODIFIED Requirements

### Requirement: Support environment-specific URL generation

The system SHALL generate different entry URLs and output formats based on environment (development uses remotes.config.json, production uses manifest.json).

**(Previously: Only generated remotes.config.json for both environments)**

#### Scenario: Development URLs use localhost

- **WHEN** environment is "development" and MicroFrontend has port 5174
- **THEN** entryUrl is `http://localhost:5174/remoteEntry.js`
- **AND** output file is remotes.config.json

#### Scenario: Production URLs use CDN with versioning

- **WHEN** environment is "production" with baseUrl "https://cdn.example.com"
- **AND** MicroFrontend has version "1.2.3"
- **THEN** entryUrl is `https://cdn.example.com/mfe-{name}/1.2.3/remoteEntry.js`
- **AND** output file is manifest.json

#### Scenario: Production includes semver version in path

- **WHEN** environment is "production" and MicroFrontend version is "1.2.3"
- **THEN** entryUrl SHALL include `/1.2.3/` in path
- **AND** SHALL NOT use git hash in URL path
- **AND** git hash SHALL be included in metadata only

---

## ADDED Requirements

### Requirement: Generate production manifest format

The system SHALL generate manifest.json format for production environment.

#### Scenario: Manifest structure for production

- **WHEN** generateManifest() is called with MicroFrontends array
- **THEN** output SHALL conform to manifest.schema.json
- **AND** SHALL include version, timestamp, environment fields
- **AND** SHALL include microfrontends object with MFE entries

#### Scenario: MFE entry in manifest

- **WHEN** adding mfe-widget version 1.2.3 to manifest
- **THEN** manifest.microfrontends["mfe-widget"] SHALL include:
  - version: "1.2.3"
  - url: "https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js"
  - scope: "widget"
  - module: "./App"
  - integrity: "sha384-..."

#### Scenario: Manifest timestamp generation

- **WHEN** manifest is generated
- **THEN** timestamp field SHALL be ISO 8601 format
- **AND** SHALL reflect current UTC time

---

### Requirement: Compute SRI hashes for production

The system SHALL compute subresource integrity hashes for production builds.

#### Scenario: Generate SHA-384 hash for remoteEntry.js

- **WHEN** generating manifest for production
- **THEN** system SHALL read remoteEntry.js file from dist/
- **AND** SHALL compute SHA-384 hash
- **AND** SHALL include hash in manifest integrity field

#### Scenario: Missing remoteEntry.js fails generation

- **WHEN** MFE dist/ directory lacks remoteEntry.js
- **THEN** manifest generation SHALL fail
- **AND** error SHALL indicate which MFE is missing remoteEntry.js

---

### Requirement: Include build metadata in manifest

The system SHALL include git commit hash and build timestamp in manifest metadata.

#### Scenario: Git metadata in manifest

- **WHEN** generating manifest in CI environment
- **THEN** system SHALL detect git commit SHA
- **AND** SHALL include in metadata.buildHash field
- **AND** SHALL include current timestamp in metadata.buildDate

#### Scenario: Local build without git

- **WHEN** generating manifest outside git repository
- **THEN** system SHALL use "local-build" as buildHash
- **AND** SHALL log warning about missing git metadata

---

### Requirement: Dual-format output support

The system SHALL support generating both remotes.config.json and manifest.json.

#### Scenario: Generate remotes.config.json for development

- **WHEN** generate-config script runs in development
- **THEN** output file SHALL be remotes.config.json
- **AND** SHALL contain remotes array format

#### Scenario: Generate manifest.json for production

- **WHEN** generate-manifest script runs for production
- **THEN** output file SHALL be manifest.json
- **AND** SHALL contain manifest format with microfrontends object

#### Scenario: Validate output against correct schema

- **WHEN** generating remotes.config.json
- **THEN** validate against remotes-config.schema.json
- **WHEN** generating manifest.json
- **THEN** validate against manifest.schema.json
