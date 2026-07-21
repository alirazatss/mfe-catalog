## MODIFIED Requirements

### Requirement: Remote module fails to load

The host SHALL treat remote-load failures as slot-scoped, not global. When a remote module fails to load, the host SHALL render a slot-level fallback with a `Try again` action, log the error via `window.__MFE_ERROR__.report(...)`, and leave other slots functional.

**(Previously: The host SHALL display an error boundary fallback UI for the whole application)**

**Reason for change**: The Chrome MFE pattern (ADR-0004) requires slot-scoped failure isolation. A broken feature MFE should not blank out the chrome slots (header, sidebar, footer) or vice versa.

#### Scenario: Feature MFE load failure

- **WHEN** a feature MFE fails to load (network error, 404, initialization exception)
- **THEN** only the `main-slot` SHALL show the fallback UI
- **AND** the chrome slots SHALL remain mounted and functional
- **AND** `window.__MFE_ERROR__.report({ mfe, slot, type: 'load', error, timestamp })` SHALL be invoked
- **AND** the fallback SHALL include a `Try again` button wired to `loader.retryLoad(name, slotId)`

#### Scenario: Chrome MFE load failure

- **WHEN** a chrome MFE fails to load
- **THEN** only that chrome slot SHALL show the fallback UI
- **AND** other slots (chrome and feature) SHALL remain functional
- **AND** the fallback text SHALL identify the specific chrome MFE by name

#### Scenario: Retry succeeds

- **GIVEN** a slot shows the fallback UI
- **WHEN** the user clicks `Try again` and the load succeeds
- **THEN** the fallback SHALL be cleared
- **AND** the MFE SHALL mount normally
- **AND** `mfe:loaded` SHALL fire with the corresponding payload

---

### Requirement: Config fetch fails with retry

The host SHALL fetch the manifest with exponential backoff (3 attempts). On exhaustion, the host SHALL fall back to a cached manifest from `localStorage` (max age 24 hours). If no valid cache exists, the host SHALL render a critical-error template into `#app` and stop bootstrap.

**(Previously: The system SHALL retry after 1 second, retry again after 2 seconds, fail after 3 attempts, log the error, and continue with graceful degradation)**

**Reason for change**: "Continue with graceful degradation" was vague — the app really cannot function without a manifest. The updated behavior gives the app a real chance to recover via `localStorage` cache and fails loudly (but usefully) when no cache exists.

#### Scenario: Retry backoff sequence

- **GIVEN** the manifest fetch returns HTTP 500
- **WHEN** the loader retries
- **THEN** it SHALL wait 1 s, 2 s, 4 s between the three attempts
- **AND** it SHALL emit `config:fetch:error` for each failure

#### Scenario: Cache fallback used

- **GIVEN** all three fetches fail
- **AND** a manifest cached in `localStorage` is younger than 24 hours and matches the current schema version
- **WHEN** the fallback branch runs
- **THEN** the loader SHALL return the cached manifest
- **AND** an `mfe:manifest:cache-fallback` event SHALL be dispatched
- **AND** bootstrap SHALL proceed with the cached data

#### Scenario: No cache available triggers critical error

- **GIVEN** all three fetches fail
- **AND** no valid cached manifest exists
- **WHEN** the bootstrap sequence returns to the shell
- **THEN** the shell SHALL render the critical-error template into `#app`
- **AND** no MFE SHALL be mounted
- **AND** `window.__MFE_ERROR__?.report({ mfe: 'shell', type: 'load', error, timestamp })` SHALL be invoked
