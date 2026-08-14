# thin-shell-bootstrap Delta

## MODIFIED Requirements

### Requirement: Shell SHALL initialize the application via a vanilla TypeScript entry point

The shell SHALL boot without importing React or any UI framework. The entry module SHALL fetch the manifest (currently the `remotes.config.json` `RemoteConfig` artifact), initialize authentication, mount MFEs into named DOM slots, and handle route changes using plain browser APIs. The shell SHALL NOT contain a baked-in fallback remote config: when the manifest cannot be fetched, the only permitted behavior is the critical-error UI.

#### Scenario: Successful bootstrap

- **GIVEN** the shell HTML has been served to the browser
- **AND** the manifest at `/remotes.config.json` is reachable
- **AND** the token refresh cookie (if any) is valid
- **WHEN** the entry module executes
- **THEN** the shell SHALL fetch and parse the manifest
- **AND** the shell SHALL call `tokenManager.initialize()`
- **AND** the shell SHALL populate `window.__MFE_AUTH__` with `{ getToken, isAuthenticated, onTokenChange, logout, version }`
- **AND** the shell SHALL mount chrome MFEs listed in `manifest.chrome` into their corresponding slots in parallel
- **AND** the shell SHALL match `window.location.pathname` against `manifest.features` and mount the matching MFE into `main-slot`

#### Scenario: Unauthenticated user visits a protected route

- **GIVEN** the manifest marks `/widget` with `requiresAuth: true`
- **AND** no valid refresh cookie exists (auth initialization fails)
- **WHEN** the user visits `/widget`
- **THEN** the shell SHALL NOT mount the feature MFE
- **AND** the shell SHALL redirect the browser to `/login`
- **AND** the shell SHALL preserve the original path via `?returnUrl=/widget`

#### Scenario: Unauthenticated user visits a public route

- **GIVEN** the manifest marks `/marketing` with `requiresAuth: false`
- **AND** no valid refresh cookie exists
- **WHEN** the user visits `/marketing`
- **THEN** the shell SHALL mount the matching MFE without redirecting
- **AND** `window.__MFE_AUTH__.isAuthenticated()` SHALL return `false`

#### Scenario: Manifest fetch fails after retries

- **GIVEN** the manifest endpoint returns HTTP 500 on every attempt
- **WHEN** the shell exhausts its retry budget (3 attempts with exponential backoff)
- **THEN** the shell SHALL replace `#app` innerHTML with a static critical-error template
- **AND** the error template SHALL include a `Reload` button that calls `location.reload()`
- **AND** no MFE SHALL be mounted
- **AND** the shell SHALL NOT load remotes from any baked-in fallback config

#### Scenario: No fallback remote config exists in the bundle

- **WHEN** the built shell bundle is inspected
- **THEN** it contains no remote entry URLs other than those fetched from `/remotes.config.json` at runtime
- **AND** the source file previously exporting `FALLBACK_REMOTES` is removed

#### Scenario: Auth initialization throws unexpected error

- **GIVEN** the manifest loads successfully
- **AND** `tokenManager.initialize()` throws an unexpected error (not a 401)
- **WHEN** bootstrap runs
- **THEN** the shell SHALL log the error via `console.error`
- **AND** the shell SHALL treat the user as unauthenticated
- **AND** the shell SHALL continue mounting public MFEs
