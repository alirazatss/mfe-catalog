# thin-shell-bootstrap Specification

## Purpose

TBD - created by archiving change refactor-to-thin-shell. Update Purpose after archive.

## Requirements

### Requirement: Shell SHALL initialize the application via a vanilla TypeScript entry point

The shell SHALL boot without importing React or any UI framework. The entry module SHALL fetch the manifest (currently the `remotes.config.json` `RemoteConfig` artifact), initialize authentication, mount MFEs into named DOM slots, and handle route changes using plain browser APIs.

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

#### Scenario: Auth initialization throws unexpected error

- **GIVEN** the manifest loads successfully
- **AND** `tokenManager.initialize()` throws an unexpected error (not a 401)
- **WHEN** bootstrap runs
- **THEN** the shell SHALL log the error via `console.error`
- **AND** the shell SHALL treat the user as unauthenticated
- **AND** the shell SHALL continue mounting public MFEs

---

### Requirement: Shell HTML SHALL provide named DOM slots for MFEs

The shell's `index.html` SHALL define exactly four fixed slot elements — `header-slot`, `sidebar-slot`, `main-slot`, `footer-slot` — arranged by CSS grid.

#### Scenario: Slots exist on initial HTML

- **GIVEN** the browser loads `apps/shells/website/index.html`
- **WHEN** the parser finishes
- **THEN** the DOM SHALL contain elements with IDs `header-slot`, `sidebar-slot`, `main-slot`, `footer-slot`
- **AND** each element SHALL carry `data-slot="<name>"`
- **AND** they SHALL be children of an element with ID `app`

#### Scenario: CSS grid renders slots in correct regions

- **GIVEN** the shell CSS is applied
- **WHEN** the slots are empty
- **THEN** `header-slot` SHALL occupy the top full-width row
- **AND** `sidebar-slot` SHALL occupy the left column below header
- **AND** `main-slot` SHALL fill the remaining central area
- **AND** `footer-slot` SHALL occupy the bottom full-width row

#### Scenario: MFE mounts into a slot

- **GIVEN** the shell has loaded a chrome MFE for the `header` slot
- **WHEN** the MFE mount lifecycle completes
- **THEN** `header-slot` SHALL contain the MFE's rendered DOM
- **AND** the other slots SHALL be unaffected

---

### Requirement: Shell SHALL match URLs to MFEs via manifest prefix matching

The shell SHALL determine which feature MFE to mount by matching `window.location.pathname` against the keys of `manifest.features` using longest-prefix wins.

#### Scenario: Exact prefix match

- **GIVEN** manifest contains features for `/widget` and `/widget/analytics`
- **WHEN** the user visits `/widget/analytics`
- **THEN** the shell SHALL select the entry for `/widget/analytics` (longer prefix wins)

#### Scenario: No matching route

- **GIVEN** manifest has no feature matching `/unknown-page`
- **WHEN** the user visits `/unknown-page`
- **THEN** the shell SHALL leave `main-slot` empty
- **AND** the shell SHALL show a not-found placeholder within `main-slot`
- **AND** chrome MFEs SHALL remain mounted

#### Scenario: Route change swaps feature MFE

- **GIVEN** `mfe-widget` is currently mounted in `main-slot` for `/widget`
- **WHEN** the user navigates to `/dashboard`
- **THEN** the shell SHALL unmount `mfe-widget`
- **AND** the shell SHALL mount `mfe-dashboard` into `main-slot`
- **AND** chrome MFEs SHALL NOT be unmounted

---

### Requirement: Shell SHALL keep its runtime code under a strict size ceiling

The shell's runtime source code (TypeScript/JavaScript inside `apps/shells/website/src/`, excluding types and tests) SHALL NOT exceed 250 lines total. CSS SHALL be layout-only.

#### Scenario: Static line-count check during build

- **GIVEN** the shell's runtime source files
- **WHEN** the build pipeline counts non-blank, non-comment lines in `apps/shells/website/src/**/*.{ts,js}` (excluding `*.d.ts` and `*.test.*`)
- **THEN** the total SHALL be less than or equal to 250
- **AND** exceeding the limit SHALL fail the build with a descriptive error

#### Scenario: Shell CSS contains no visual styling

- **GIVEN** `apps/shells/website/src/style.css` (or equivalent shell stylesheet)
- **WHEN** the file is reviewed
- **THEN** the file SHALL contain only layout rules (grid, flex, sizing, positioning)
- **AND** the file SHALL NOT contain colors, typography, spacing tokens, or component-level styling other than reset/normalize essentials
