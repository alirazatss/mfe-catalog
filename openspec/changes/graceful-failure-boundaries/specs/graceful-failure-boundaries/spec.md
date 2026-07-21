## ADDED Requirements

### Requirement: Shell SHALL expose `window.__MFE_ERROR__` global for structured error reporting

The shell bootstrap SHALL create an Error Bridge instance and expose it at `window.__MFE_ERROR__` matching a `MFEErrorAPI` contract.

#### Scenario: Error bridge exposed at bootstrap

- **GIVEN** the shell finishes bootstrap
- **WHEN** any script reads `window.__MFE_ERROR__`
- **THEN** the value SHALL be an object with `version: "1.0.0"`
- **AND** the object SHALL expose `report(error: MFEError): void` and `onError(cb): () => void`

#### Scenario: Error bridge set up first

- **GIVEN** the shell bootstrap sequence
- **WHEN** ordering setup steps
- **THEN** `setupErrorBridge()` SHALL run BEFORE `setupAuthBridge()`, `setupNavigationBridge()`, and any MFE mount
- **AND** all subsequent code SHALL be able to report errors immediately

#### Scenario: `report` invokes subscribers

- **GIVEN** an observer registered via `window.__MFE_ERROR__.onError(handler)`
- **WHEN** any code calls `window.__MFE_ERROR__.report({ mfe, type, error, timestamp })`
- **THEN** `handler` SHALL be invoked with the same payload
- **AND** multiple subscribers SHALL all be notified in registration order

#### Scenario: Subscription cleanup

- **GIVEN** a subscriber holds a cleanup function returned from `onError(handler)`
- **WHEN** the subscriber calls the cleanup function
- **THEN** further `report` calls SHALL NOT invoke that handler

#### Scenario: Missing bridge handled by callers

- **GIVEN** an MFE tries to report before the bridge is set up (e.g., misconfigured shell)
- **WHEN** the MFE's error boundary handler runs
- **THEN** the MFE SHALL feature-detect `window.__MFE_ERROR__?.report` and no-op if missing
- **AND** no unhandled exception SHALL escape the MFE

---

### Requirement: Slots SHALL render fallback UI on MFE failure

The dynamic loader SHALL render a slot-scoped fallback UI when an MFE fails to load, mount, or update. The fallback SHALL include a `Try again` action wired to `retryLoad(name, slotId)`.

#### Scenario: Load failure renders fallback in slot

- **GIVEN** the loader attempts to load `mfe-widget` into `main-slot`
- **AND** the remote fetch fails with a network error
- **WHEN** the loader catches the error
- **THEN** the `main-slot` element SHALL contain a fallback with role `alert` and text `Feature temporarily unavailable`
- **AND** the fallback SHALL include a button labeled `Try again` with `data-mfe="mfe-widget"` and `data-slot="main-slot"`
- **AND** other slots (`header-slot`, `sidebar-slot`, `footer-slot`) SHALL remain untouched
- **AND** an `mfe:load:failed` `CustomEvent` SHALL be dispatched with `{ name: 'mfe-widget', slot: 'main-slot', error }`

#### Scenario: Chrome MFE failure differentiates messaging

- **GIVEN** the loader attempts to load `mfe-header` into `header-slot`
- **AND** the load fails
- **WHEN** the loader renders the fallback
- **THEN** the fallback message SHALL read `mfe-header temporarily unavailable` (chrome MFEs use their name; feature MFEs use `Feature temporarily unavailable`)

#### Scenario: Retry button re-invokes loader

- **GIVEN** the fallback UI is visible in `main-slot`
- **WHEN** the user clicks `Try again`
- **THEN** the loader SHALL call `retryLoad('mfe-widget', 'main-slot')`
- **AND** the loader SHALL clear the slot fallback before attempting the load
- **AND** on retry success the MFE SHALL mount normally

#### Scenario: Rapid repeated failures switch to persistent error

- **GIVEN** three retries within 60 seconds all fail for the same MFE
- **WHEN** the third retry fails
- **THEN** the fallback SHALL display a `Contact support` message and hide the `Try again` button
- **AND** the loader SHALL emit `mfe:load:exhausted` `{ name, slot, attempts: 3 }`

#### Scenario: XSS-safe rendering

- **GIVEN** a manifest MFE name contains HTML characters (e.g., `<script>`)
- **WHEN** the loader renders the fallback for that MFE
- **THEN** the injected DOM SHALL contain the escaped text, not executable HTML
- **AND** dev-tools inspection SHALL confirm no `<script>` element was created from the MFE name

---

### Requirement: MFEs SHALL wrap their app in a runtime error boundary

Every MFE SHALL wrap its root component tree in `react-error-boundary` and report caught errors via `window.__MFE_ERROR__.report(...)`.

#### Scenario: React render error caught in-place

- **GIVEN** a child component in `mfe-widget` throws during render
- **WHEN** React catches the error
- **THEN** the MFE's error-boundary SHALL render the MFE-specific fallback (e.g., `Widget encountered an error [Try Again]`)
- **AND** `window.__MFE_ERROR__.report(...)` SHALL be called with `{ mfe: 'mfe-widget', type: 'runtime', error, info, timestamp }`
- **AND** other MFEs and chrome slots SHALL continue to function

#### Scenario: Fallback reset reloads MFE

- **GIVEN** the runtime error fallback is visible with a `Try Again` button
- **WHEN** the user clicks `Try Again`
- **THEN** the error boundary SHALL reset (per `react-error-boundary` semantics)
- **AND** the MFE SHALL attempt to re-render its normal tree
- **AND** if the underlying condition persists the fallback SHALL reappear

---

### Requirement: Auth refresh failures SHALL retry with backoff, then graceful logout

The shell SHALL wire `TokenManager.on('refresh:failed', ...)` to `refreshWithBackoff({ maxAttempts: 3, baseMs: 500 })`. If backoff exhausts, the shell SHALL clear the session and redirect to `/login?returnUrl=<current>`.

#### Scenario: Transient failure recovers

- **GIVEN** `tokenManager.refreshToken()` fails once with HTTP 500
- **WHEN** the shell's `refresh:failed` handler runs
- **THEN** the handler SHALL retry after 500 ms
- **AND** if that succeeds the user SHALL remain authenticated
- **AND** the MFE token state SHALL update via `mfe:auth:token-updated`

#### Scenario: Persistent failure triggers logout

- **GIVEN** `tokenManager.refreshToken()` fails 3 consecutive times
- **WHEN** the backoff sequence completes without success
- **THEN** the handler SHALL call `tokenManager.clearSession()`
- **AND** the browser SHALL redirect to `/login?returnUrl=<encoded current pathname>`
- **AND** the shell SHALL NOT enter an infinite refresh loop

#### Scenario: Return URL preserved through login

- **GIVEN** the user was on `/widget/edit/42` when refresh failed permanently
- **WHEN** the redirect fires
- **THEN** the target URL SHALL be `/login?returnUrl=%2Fwidget%2Fedit%2F42`

---

### Requirement: Bootstrap SHALL render a critical-error page on unrecoverable startup failure

When the shell cannot start (manifest fetch fails AND no cache is available), the bootstrap SHALL replace `#app` innerHTML with a critical-error template.

#### Scenario: Critical error path

- **GIVEN** manifest fetch fails after retries
- **AND** `readFromCache()` returns no cached manifest
- **WHEN** bootstrap reaches the critical error path
- **THEN** `#app` innerHTML SHALL be replaced by a static critical-error template
- **AND** the template SHALL contain a headline `Something went wrong` and a `Reload` button
- **AND** the `Reload` button SHALL call `location.reload()` when clicked
- **AND** no MFE SHALL be mounted

#### Scenario: Critical error reported

- **GIVEN** the critical error path runs
- **WHEN** the template is rendered
- **THEN** `window.__MFE_ERROR__?.report(...)` SHALL be called with `{ mfe: 'shell', type: 'load', error, timestamp }` (if the bridge is available at that point)

---

### Requirement: Manifest fetch SHALL cache in `localStorage` with a 24-hour TTL

`fetchManifestWithRetry` SHALL persist a valid manifest to `localStorage` and SHALL fall back to that cache when network retries are exhausted.

#### Scenario: Successful fetch writes cache

- **GIVEN** a successful manifest fetch
- **WHEN** the fetch resolves with a valid manifest
- **THEN** the cache utility SHALL write the manifest to `localStorage` under a known key with `timestamp: Date.now()`

#### Scenario: Network failure with fresh cache

- **GIVEN** all network retries have failed
- **AND** the cache contains a manifest younger than 24 hours
- **WHEN** the fetch helper reaches its fallback branch
- **THEN** it SHALL return the cached manifest
- **AND** it SHALL log `Using cached manifest` in dev mode
- **AND** it SHALL emit a `mfe:manifest:cache-fallback` event

#### Scenario: Cache older than 24 hours ignored

- **GIVEN** the cached manifest is older than 24 hours
- **WHEN** the fallback branch runs
- **THEN** the cache SHALL be ignored
- **AND** the helper SHALL return `null` (triggering the critical-error path)

#### Scenario: Schema version mismatch invalidates cache

- **GIVEN** the cached manifest has a `schemaVersion` different from the current expected version
- **WHEN** the fallback branch reads the cache
- **THEN** the cache SHALL be treated as stale and the helper SHALL return `null`
