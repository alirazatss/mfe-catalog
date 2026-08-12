## ADDED Requirements

### Requirement: Manifest Fetching at Startup

The shell application SHALL fetch the deployment manifest at startup.

#### Scenario: Fetch manifest on app initialization

- **WHEN** shell application bootstraps
- **THEN** it SHALL fetch manifest from configured URL
- **AND** SHALL wait for manifest response before initializing MFEs

#### Scenario: Manifest fetch timeout

- **WHEN** manifest fetch takes longer than 10 seconds
- **THEN** shell SHALL abort with timeout error
- **AND** SHALL display user-friendly error message

#### Scenario: Manifest fetch failure fallback

- **WHEN** manifest fetch fails with network error
- **THEN** shell SHALL attempt retry up to 3 times with exponential backoff
- **AND** SHALL fall back to cached manifest if available

---

### Requirement: Parse Manifest JSON

The shell application SHALL parse and validate the manifest structure.

#### Scenario: Parse valid manifest

- **WHEN** manifest is successfully fetched
- **THEN** shell SHALL parse JSON response
- **AND** SHALL validate it contains required fields (version, microfrontends)

#### Scenario: Invalid JSON handling

- **WHEN** manifest response is not valid JSON
- **THEN** shell SHALL fail with parse error
- **AND** SHALL log error to console with response snippet

#### Scenario: Schema validation

- **WHEN** manifest is parsed
- **THEN** shell SHALL validate structure matches expected schema
- **AND** SHALL reject manifest if required fields are missing

---

### Requirement: Dynamic MFE URL Resolution

The shell application SHALL resolve MFE URLs from manifest at runtime.

#### Scenario: Resolve MFE URL from manifest

- **WHEN** shell needs to load mfe-widget
- **THEN** it SHALL look up "mfe-widget" in manifest.microfrontends
- **AND** SHALL use the URL field as the remoteEntry location

#### Scenario: MFE not in manifest

- **WHEN** shell attempts to load MFE not listed in manifest
- **THEN** dynamic loader SHALL reject with error "MFE not found in manifest"
- **AND** error SHALL include MFE name and available MFE list

---

### Requirement: Cache Manifest Locally

The shell application SHALL cache the manifest to enable offline operation.

#### Scenario: Store manifest in localStorage

- **WHEN** manifest is successfully fetched
- **THEN** shell SHALL store it in localStorage under key "mfe-manifest"
- **AND** SHALL include timestamp of fetch

#### Scenario: Use cached manifest on network failure

- **WHEN** manifest fetch fails and cached manifest exists
- **THEN** shell SHALL use cached manifest
- **AND** SHALL log warning indicating fallback to cache

#### Scenario: Cache expiration

- **WHEN** cached manifest is older than 24 hours
- **THEN** shell SHALL NOT use cache as fallback
- **AND** SHALL force user to retry with network connection

---

### Requirement: Manifest Version Compatibility Check

The shell application SHALL verify it can handle the manifest version.

#### Scenario: Compatible manifest version

- **WHEN** manifest version is "1.0.0" and shell supports "1.x"
- **THEN** shell SHALL proceed with manifest loading

#### Scenario: Incompatible major version

- **WHEN** manifest version is "2.0.0" and shell supports "1.x"
- **THEN** shell SHALL reject manifest
- **AND** SHALL display error "Manifest version incompatible, please update application"

#### Scenario: Forward-compatible minor version

- **WHEN** manifest version is "1.5.0" and shell supports "1.2.0"
- **THEN** shell SHALL proceed with manifest loading
- **AND** SHALL ignore unknown optional fields

---

### Requirement: Subresource Integrity Verification

The shell application SHALL verify SRI hashes for security.

#### Scenario: Verify integrity hash before load

- **WHEN** loading MFE with integrity hash in manifest
- **THEN** shell SHALL pass integrity attribute to script tag
- **AND** browser SHALL verify hash before executing script

#### Scenario: Integrity mismatch handling

- **WHEN** browser detects SRI hash mismatch
- **THEN** script load SHALL fail
- **AND** shell SHALL log security error and skip that MFE

#### Scenario: Missing integrity hash warning

- **WHEN** manifest entry lacks integrity field
- **THEN** shell SHALL log warning in development mode
- **AND** SHALL proceed without integrity check (not recommended for production)

---

### Requirement: Environment-Aware Manifest URLs

The shell application SHALL use different manifest URLs per environment.

#### Scenario: Production manifest URL

- **WHEN** shell is running in production
- **THEN** it SHALL fetch manifest from "https://tssmfestorage.blob.core.windows.net/mfes-prod/manifest.json"

#### Scenario: Staging manifest URL

- **WHEN** shell is running in staging
- **THEN** it SHALL fetch manifest from a staging-designated container/path on the same `tssmfestorage` account (no separate staging CDN subdomain exists)

#### Scenario: Development local config

- **WHEN** shell is running in development
- **THEN** it SHALL skip manifest fetch
- **AND** SHALL use generated remotes.config.json from localhost

---

### Requirement: Manifest Update Detection

The shell application SHALL detect when manifest has been updated.

#### Scenario: Poll manifest for updates

- **WHEN** shell has been running for more than 5 minutes
- **THEN** it SHALL poll manifest URL every 5 minutes
- **AND** SHALL compare version or ETag to detect changes

#### Scenario: Notify user of updates

- **WHEN** manifest update is detected
- **THEN** shell SHALL display notification "New version available, please refresh"
- **AND** SHALL provide button to reload application

#### Scenario: Auto-reload on update

- **WHEN** user enables auto-reload setting
- **THEN** shell SHALL automatically reload page when manifest updates
- **AND** SHALL not interrupt active user workflows

---

### Requirement: Graceful Degradation

The shell application SHALL handle manifest loading failures gracefully.

#### Scenario: Display error UI on manifest failure

- **WHEN** manifest cannot be fetched or parsed
- **THEN** shell SHALL display error screen explaining the issue
- **AND** SHALL provide "Retry" button

#### Scenario: Partial manifest fallback

- **WHEN** some MFEs fail to load from manifest
- **THEN** shell SHALL still render successfully loaded MFEs
- **AND** SHALL display error placeholders for failed MFEs

#### Scenario: Development fallback config

- **WHEN** running locally and manifest fetch fails
- **THEN** shell SHALL automatically fall back to local remotes.config.json
- **AND** SHALL log warning about fallback
