## MODIFIED Requirements

### Requirement: Fetch remote config at runtime

The system SHALL fetch and validate remote configuration (either static `remotes.config.json` for development or dynamic manifest for production) at runtime before loading any micro-frontends.

**(Previously: Only supported static remotes.config.json file)**

#### Scenario: Config fetched successfully from static file

- **GIVEN** environment is development
- **WHEN** loader.init() is called
- **THEN** system fetches `/remotes.config.json` via HTTP GET
- **AND** validates the response against JSON Schema
- **AND** caches validated config in memory
- **AND** emits `config:fetch:success` event

#### Scenario: Manifest fetched successfully from CDN

- **GIVEN** environment is production
- **WHEN** loader.init({manifestUrl: "https://cdn.example.com/manifest.json"}) is called
- **THEN** system fetches manifest from provided URL
- **AND** transforms manifest structure to internal config format
- **AND** validates transformed config
- **AND** caches config in memory
- **AND** emits `config:fetch:success` event with source: "manifest"

#### Scenario: Config fetch fails with retry

- **GIVEN** the config endpoint is unavailable
- **WHEN** config fetch returns HTTP 500
- **THEN** system retries after 1 second delay
- **AND** retries again after 2 second delay if still failing
- **AND** throws error after 3 total attempts
- **AND** emits `config:fetch:error` event with error details

#### Scenario: Config validation fails

- **WHEN** fetched JSON does not conform to RemoteConfig schema
- **THEN** system throws validation error
- **AND** error message includes schema violation details
- **AND** emits `config:fetch:error` event

#### Scenario: Cached config returned on subsequent calls

- **WHEN** loader.init() is called after successful initial fetch
- **THEN** system returns cached config without HTTP request
- **AND** does not emit `config:fetch:start` event

#### Scenario: Manifest-to-config transformation

- **WHEN** manifest is fetched from CDN
- **THEN** system SHALL transform manifest.microfrontends object to remotes array
- **AND** SHALL map manifest url field to entryUrl in config
- **AND** SHALL map manifest scope and module fields
- **AND** SHALL include integrity hash if present

---

### Requirement: Support manifest URL configuration

The system SHALL allow configuring manifest URL via init options.

**(New requirement added to support production deployment)**

#### Scenario: Initialize with manifest URL

- **WHEN** loader.init({manifestUrl: "https://cdn.example.com/manifest.json"}) is called
- **THEN** system SHALL fetch from provided manifest URL
- **AND** SHALL NOT attempt to fetch /remotes.config.json

#### Scenario: Initialize without manifest URL

- **WHEN** loader.init() is called without manifestUrl option
- **THEN** system SHALL default to fetching /remotes.config.json
- **AND** SHALL use development static config mode

#### Scenario: Environment-based manifest URL

- **WHEN** loader.init({manifestUrl: process.env.MANIFEST_URL}) is called
- **THEN** system SHALL use environment variable value
- **AND** SHALL support different URLs per environment

---

## ADDED Requirements

### Requirement: Validate manifest schema

The system SHALL validate fetched manifest against manifest JSON schema before transformation.

#### Scenario: Valid manifest passes validation

- **WHEN** manifest is fetched from CDN
- **THEN** system SHALL validate it against manifest.schema.json
- **AND** SHALL proceed with transformation if valid

#### Scenario: Invalid manifest rejected

- **WHEN** manifest does not conform to schema
- **THEN** system SHALL throw error "Invalid manifest structure"
- **AND** SHALL include validation errors in error message
- **AND** SHALL emit `config:fetch:error` event

---

### Requirement: Cache manifest locally for offline support

The system SHALL cache fetched manifest in localStorage for offline fallback.

#### Scenario: Store manifest in localStorage after fetch

- **WHEN** manifest is successfully fetched and validated
- **THEN** system SHALL store it in localStorage under key "mfe-manifest-cache"
- **AND** SHALL include timestamp and version in cached entry

#### Scenario: Use cached manifest on network failure

- **WHEN** manifest fetch fails with network error
- **AND** cached manifest exists in localStorage
- **THEN** system SHALL load cached manifest
- **AND** SHALL emit `config:fetch:cache` event
- **AND** SHALL log warning about using cached data

#### Scenario: Expire old cached manifest

- **WHEN** cached manifest is older than 24 hours
- **THEN** system SHALL NOT use cache as fallback
- **AND** SHALL throw error requiring network connection

---

### Requirement: Support subresource integrity verification

The system SHALL include integrity hashes from manifest in script loading.

#### Scenario: Load remote with SRI hash

- **WHEN** manifest entry includes integrity field
- **AND** loader.loadRemote() is called for that MFE
- **THEN** system SHALL add integrity attribute to script tag
- **AND** browser SHALL verify hash before execution

#### Scenario: SRI mismatch handling

- **WHEN** browser detects integrity mismatch
- **THEN** script load fails
- **AND** system emits `remote:load:error` event with "integrity-mismatch" reason

#### Scenario: Missing integrity warning

- **WHEN** manifest entry lacks integrity field
- **AND** environment is production
- **THEN** system SHALL log warning about missing SRI hash
- **AND** SHALL proceed without integrity check
