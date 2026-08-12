## ADDED Requirements

### Requirement: Manifest File Structure

The system SHALL provide a JSON manifest file describing all deployed micro-frontends.

#### Scenario: Valid manifest structure

- **WHEN** the manifest file is generated
- **THEN** it SHALL contain a "microfrontends" object mapping MFE names to configurations
- **AND** it SHALL contain "version", "timestamp", and "environment" fields at root level

#### Scenario: Manifest conforms to JSON schema

- **WHEN** validating the manifest
- **THEN** it SHALL conform to the manifest.schema.json schema
- **AND** SHALL pass JSON schema validation

---

### Requirement: MFE Configuration in Manifest

The system SHALL include complete configuration for each micro-frontend in the manifest.

#### Scenario: Complete MFE entry

- **WHEN** a micro-frontend is included in the manifest
- **THEN** its entry SHALL contain:
  - version (semver string)
  - url (HTTPS Azure Blob Storage URL to remoteEntry.js, e.g. `https://tssmfestorage.blob.core.windows.net/mfes-prod/<mfe-name>/v<version>/remoteEntry.js`)
  - scope (Module Federation scope name)
  - module (exposed module path like "./App")
  - integrity (SRI hash for security)

#### Scenario: Azure Blob Storage URL format

- **WHEN** manifest includes an MFE URL
- **THEN** URL SHALL follow pattern "https://tssmfestorage.blob.core.windows.net/mfes-<env>/<mfe-name>/v<version>/remoteEntry.js"
- **AND** SHALL use HTTPS protocol

#### Scenario: Missing required fields rejected

- **WHEN** generating manifest with an MFE missing required fields
- **THEN** the generation SHALL fail with error listing missing fields

---

### Requirement: Environment-Specific Manifests

The system SHALL support different manifests per environment.

#### Scenario: Development manifest uses localhost

- **WHEN** generating manifest for development environment
- **THEN** MFE URLs SHALL point to localhost:PORT
- **AND** environment field SHALL be "development"

#### Scenario: Production manifest uses Azure Blob Storage

- **WHEN** generating manifest for production environment
- **THEN** MFE URLs SHALL point to the `mfes-prod` container on `tssmfestorage.blob.core.windows.net`
- **AND** environment field SHALL be "production"

#### Scenario: Staging manifest validation

- **WHEN** generating manifest for staging environment
- **THEN** environment field SHALL be "staging"
- **AND** MFE URLs SHALL point to a staging-designated container or path prefix (no separate staging CDN subdomain exists)

---

### Requirement: Manifest Metadata

The system SHALL include metadata about the manifest and build.

#### Scenario: Timestamp inclusion

- **WHEN** manifest is generated
- **THEN** it SHALL include ISO 8601 timestamp of generation
- **AND** timestamp SHALL reflect UTC time zone

#### Scenario: Build metadata per MFE

- **WHEN** an MFE is included in manifest
- **THEN** its metadata object SHALL include:
  - buildHash (git commit SHA)
  - buildDate (ISO 8601 timestamp)
  - changelog (URL to release notes or git tag)

#### Scenario: Storage account metadata

- **WHEN** manifest is generated for production
- **THEN** it SHALL include a "storage" object with account name (`tssmfestorage`) and container (`mfes-prod`), replacing any generic "cdn" object concept

---

### Requirement: Manifest Validation

The system SHALL validate manifests before deployment.

#### Scenario: Schema validation before deploy

- **WHEN** manifest is about to be deployed
- **THEN** it SHALL be validated against manifest.schema.json
- **AND** deployment SHALL fail if validation fails

#### Scenario: URL reachability check

- **WHEN** validating production manifest
- **THEN** each MFE URL SHALL be checked for reachability
- **AND** manifest SHALL not be deployed if any URL returns 404

#### Scenario: SRI hash verification

- **WHEN** manifest includes integrity hashes
- **THEN** each hash SHALL be verified against the actual file content
- **AND** deployment SHALL fail if hashes don't match

---

### Requirement: Manifest Versioning

The system SHALL version the manifest schema itself.

#### Scenario: Schema version tracking

- **WHEN** manifest structure changes
- **THEN** the schema version SHALL be incremented following semver
- **AND** manifest SHALL include schema version in "version" field

#### Scenario: Backward compatibility check

- **WHEN** deploying a new manifest version
- **THEN** the shell application SHALL verify it can parse that version
- **AND** SHALL fallback gracefully if version is incompatible

---

### Requirement: Manifest Deployment Location

The system SHALL deploy manifests to a well-known location accessible to shell applications.

#### Scenario: Production manifest URL

- **WHEN** shell application starts in production
- **THEN** it SHALL fetch manifest from "https://tssmfestorage.blob.core.windows.net/mfes-prod/manifest.json"

#### Scenario: Manifest caching headers

- **WHEN** manifest is served from Azure Blob Storage
- **THEN** it SHALL include Cache-Control headers with max-age of 60 seconds
- **AND** SHALL include ETag for conditional requests

#### Scenario: Manifest update propagation

- **WHEN** a new manifest is deployed
- **THEN** shell applications SHALL see updated manifest within 60 seconds
- **AND** SHALL not require code redeployment
