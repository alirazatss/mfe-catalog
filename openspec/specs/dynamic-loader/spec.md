# dynamic-loader Specification

## Purpose

This specification defines the runtime dynamic loader for Module Federation micro-frontends. The loader fetches generated remote configuration at runtime, validates it against JSON Schema, and dynamically loads Module Federation containers with retry logic, event emission for telemetry, memory-based caching, and support for feature toggles via enabled flags.

## Requirements

### Requirement: Fetch remote config at runtime

The system SHALL fetch and validate the generated `remotes.config.json` file at runtime before loading any micro-frontends.

#### Scenario: Config fetched successfully

- **GIVEN** the loader has not been initialized
- **WHEN** loader.init() is called
- **THEN** system fetches `/remotes.config.json` via HTTP GET
- **AND** validates the response against JSON Schema
- **AND** caches validated config in memory
- **AND** emits `config:fetch:success` event

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

---

### Requirement: Load micro-frontends dynamically by name

The system SHALL dynamically load Module Federation remotes using the name specified in the config.

#### Scenario: Remote loaded successfully

- **GIVEN** the loader is initialized with valid config
- **WHEN** loader.loadRemote("mfe-widget") is called
- **THEN** system looks up "mfe-widget" in cached config
- **AND** injects script tag with remote's entryUrl
- **AND** initializes Module Federation sharing
- **AND** returns remote container object
- **AND** emits `remote:load:success` event

#### Scenario: Remote not found in config

- **WHEN** loader.loadRemote("unknown-remote") is called
- **THEN** system throws error with message "Remote 'unknown-remote' not found in config"
- **AND** emits `remote:load:error` event

#### Scenario: Disabled remote not loaded

- **GIVEN** config contains "mfe-analytics" with enabled: false
- **WHEN** loader.loadRemote("mfe-analytics") is called
- **THEN** system throws error with message "Remote 'mfe-analytics' is disabled"
- **AND** emits `remote:load:error` event

#### Scenario: Script loading fails

- **WHEN** remote's entryUrl returns HTTP 404
- **THEN** system throws error with message "Failed to load script from {url}"
- **AND** emits `remote:load:error` event with error details

---

### Requirement: Respect enabled flag for feature toggles

The system SHALL check the `enabled` field in config before loading any remote.

#### Scenario: Enabled remote loads normally

- **WHEN** config has remote with enabled: true
- **AND** loader.loadRemote(name) is called
- **THEN** system proceeds with loading

#### Scenario: Disabled remote throws error

- **WHEN** config has remote with enabled: false
- **AND** loader.loadRemote(name) is called
- **THEN** system throws error immediately without fetching script
- **AND** error message indicates remote is disabled

---

### Requirement: Emit lifecycle events for telemetry

The system SHALL emit events at key points in the loading lifecycle to enable monitoring and debugging.

#### Scenario: Config fetch events

- **WHEN** loader.init() starts
- **THEN** system emits `config:fetch:start` event
- **AND** on success emits `config:fetch:success` with config data
- **AND** on error emits `config:fetch:error` with error object

#### Scenario: Remote load events

- **WHEN** loader.loadRemote(name) starts
- **THEN** system emits `remote:load:start` event with remote name
- **AND** on success emits `remote:load:success` with remote name and container
- **AND** on error emits `remote:load:error` with remote name and error

#### Scenario: Event listeners receive typed data

- **WHEN** listener is registered via loader.on("config:fetch:success", callback)
- **THEN** callback receives event object with `{ config: RemoteConfig }`
- **AND** TypeScript types enforce correct event data structure

---

### Requirement: Cache loaded remotes to avoid duplicate fetches

The system SHALL cache remote containers after first successful load.

#### Scenario: First load fetches and caches

- **WHEN** loader.loadRemote("mfe-widget") is called first time
- **THEN** system fetches script and initializes container
- **AND** stores container in memory cache

#### Scenario: Subsequent load returns cached container

- **WHEN** loader.loadRemote("mfe-widget") is called again
- **THEN** system returns cached container immediately
- **AND** does not fetch script again
- **AND** does not emit `remote:load:start` event

#### Scenario: Cache cleared and remote reloaded

- **WHEN** loader.clearCache() is called
- **AND** loader.loadRemote("mfe-widget") is called
- **THEN** system fetches script again as if first load

---

### Requirement: Provide preload API for performance optimization

The system SHALL allow preloading remotes before they are actually needed.

#### Scenario: Preload fetches without initializing

- **WHEN** loader.preload("mfe-widget") is called
- **THEN** system fetches and caches config (if not cached)
- **AND** injects script tag for remote
- **AND** does NOT initialize Module Federation sharing
- **AND** emits `remote:preload:success` event

#### Scenario: Preloaded remote loads instantly

- **WHEN** loader.preload("mfe-widget") completes
- **AND** loader.loadRemote("mfe-widget") is called
- **THEN** system skips script fetch (already loaded)
- **AND** only performs Module Federation initialization
- **AND** load completes faster than first load

---

### Requirement: Provide loader status API for health checks

The system SHALL expose loader state for debugging and monitoring.

#### Scenario: Status before initialization

- **WHEN** loader.getStatus() is called before init()
- **THEN** system returns `{ initialized: false, configLoaded: false, remotesLoaded: [] }`

#### Scenario: Status after config loaded

- **WHEN** loader.init() completes successfully
- **AND** loader.getStatus() is called
- **THEN** system returns `{ initialized: true, configLoaded: true, remotesLoaded: [] }`

#### Scenario: Status after remotes loaded

- **WHEN** loader.loadRemote("mfe-widget") completes
- **AND** loader.getStatus() is called
- **THEN** system returns `{ initialized: true, configLoaded: true, remotesLoaded: ["mfe-widget"] }`

---

### Requirement: Support singleton pattern to prevent duplicate instances

The system SHALL export a single global loader instance to ensure consistent state.

#### Scenario: Default export is singleton

- **WHEN** multiple modules import loader
- **THEN** all imports reference the same instance
- **AND** config cache is shared across all imports

#### Scenario: Manual instantiation allowed for testing

- **WHEN** test creates new DynamicLoader() instance
- **THEN** new instance has separate state from singleton
- **AND** does not interfere with global loader

---

### Requirement: Handle scope mapping for Module Federation

The system SHALL use the `scope` field from config to access the correct global container.

#### Scenario: Scope matches global container

- **WHEN** config has remote with scope: "widgetScope"
- **AND** remote script defines `window.widgetScope` container
- **AND** loader.loadRemote(name) is called
- **THEN** system accesses container via `window[scope]`
- **AND** initializes sharing on correct container

#### Scenario: Missing scope in config uses name

- **WHEN** config remote has no scope field
- **THEN** system falls back to using remote name as scope
- **AND** accesses `window[name]` container

---

### Requirement: Validate environment compatibility

The system SHALL detect runtime environment and fail fast if incompatible.

#### Scenario: Browser environment detected

- **WHEN** loader runs in browser with window and document
- **THEN** system proceeds normally

#### Scenario: Node.js environment rejected

- **WHEN** loader runs in Node.js (no window object)
- **THEN** system throws error "DynamicLoader requires browser environment"
- **AND** does not attempt to fetch config

---

### Requirement: Support clearing cache for development

The system SHALL provide API to clear all cached data.

#### Scenario: Clear cache resets state

- **WHEN** loader has cached config and remotes
- **AND** loader.clearCache() is called
- **THEN** system clears config cache
- **AND** clears remote container cache
- **AND** next init() or loadRemote() refetches data

---

### Requirement: Provide error context for debugging

The system SHALL include detailed context in error messages.

#### Scenario: Config fetch error includes URL

- **WHEN** config fetch fails
- **THEN** error message includes "Failed to fetch config from /remotes.config.json"
- **AND** includes HTTP status code if available

#### Scenario: Remote load error includes name and URL

- **WHEN** remote script load fails
- **THEN** error message includes "Failed to load remote 'mfe-widget' from {url}"
- **AND** includes underlying error cause

#### Scenario: Validation error includes schema path

- **WHEN** config validation fails
- **THEN** error message includes JSON Schema path (e.g., "remotes[0].entryUrl")
- **AND** includes validation rule that failed
