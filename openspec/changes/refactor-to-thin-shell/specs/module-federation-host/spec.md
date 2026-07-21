## MODIFIED Requirements

### Requirement: Host application SHALL load federated modules

The host application SHALL dynamically load remote federated modules and mount them into named DOM slots via a vanilla JavaScript bootstrap sequence. The host SHALL NOT render React components directly; it only orchestrates slot-based MFE mounting.

**(Previously: Loaded via React Router lazy routes and React `Suspense` boundaries)**

**Reason for change**: The Chrome MFE pattern (ADR-0004) requires the shell to be a thin, framework-agnostic coordinator that mounts MFEs into fixed DOM slots. React Router and Suspense stay inside the MFEs; the shell uses vanilla JS to fetch manifest, match routes, and mount MFEs.

#### Scenario: Host initializes bootstrap and loader at startup

- **GIVEN** the host application is starting
- **WHEN** the entry module `apps/website/src/main.ts` executes
- **THEN** the shell SHALL fetch `/manifest-<env>.json` (env resolved at build time)
- **AND** the manifest SHALL be validated against the manifest schema
- **AND** the loader SHALL cache the manifest in memory
- **AND** `tokenManager.initialize()` SHALL run before any MFE is mounted
- **AND** chrome MFEs listed in `manifest.chrome` SHALL be mounted in parallel into their named slots

#### Scenario: Host loads feature MFE via URL prefix match

- **GIVEN** the shell has cached the manifest
- **AND** `manifest.features["/widget"]` maps to `mfe-widget` with an `entryUrl`
- **WHEN** the user's initial URL is `/widget/dashboard`
- **THEN** the shell SHALL match `/widget` (longest-prefix wins)
- **AND** the shell SHALL call `loader.loadRemote("mfe-widget")` targeting `main-slot`
- **AND** the loader SHALL inject the remote's script tag
- **AND** the loader SHALL initialize Module Federation sharing
- **AND** the remote SHALL mount into `main-slot`
- **AND** remote load success SHALL be logged in development mode

#### Scenario: Host lazy-loads MFE on first route access

- **GIVEN** the user has not accessed `/widget` yet
- **AND** `mfe-widget` has not been loaded
- **WHEN** the user navigates to `/widget/list`
- **THEN** the shell SHALL match `/widget` from the manifest
- **AND** the shell SHALL initiate loading of `mfe-widget`
- **AND** the shell SHALL show a static loading placeholder in `main-slot` while loading
- **AND** once loaded, `mfe-widget` SHALL mount into `main-slot`

#### Scenario: MFE not loaded until route accessed

- **GIVEN** the manifest defines features for `/widget`, `/checkout`, `/analytics`
- **WHEN** the user navigates to `/checkout/cart`
- **THEN** the shell SHALL load ONLY `mfe-checkout`
- **AND** the shell SHALL NOT load `mfe-widget` or `mfe-analytics`
- **AND** the network SHALL only fetch `mfe-checkout`'s `remoteEntry.js`

#### Scenario: Config fetch fails with retry

- **GIVEN** the host application is starting
- **WHEN** manifest fetch returns HTTP 500
- **THEN** the shell SHALL retry with exponential backoff (1s, 2s, 4s)
- **AND** the shell SHALL fail after 3 total attempts
- **AND** the shell SHALL render the critical-error template into `#app`
- **AND** the error SHALL be logged to `console.error`

#### Scenario: Remote not found in manifest

- **GIVEN** the shell is initialized with a valid manifest
- **WHEN** a route matches a feature entry whose `mfe` name is missing from the loader registry
- **THEN** the loader SHALL throw an error `Remote '<name>' not found in manifest`
- **AND** the shell SHALL render a slot-level error placeholder in `main-slot`
- **AND** chrome MFEs SHALL remain functional

#### Scenario: Remote is disabled in manifest

- **GIVEN** manifest entry for `mfe-analytics` has `enabled: false`
- **WHEN** the user navigates to a route mapped to `mfe-analytics`
- **THEN** the loader SHALL NOT load the remote
- **AND** the shell SHALL render a `Feature disabled` placeholder in `main-slot`
- **AND** the event SHALL be logged in development mode

#### Scenario: Remote module fails to load

- **WHEN** a federated remote module fails to load (network error, script 404, initialization failure)
- **THEN** the shell SHALL render a slot-level error placeholder with a `Try again` button in the target slot
- **AND** the error SHALL be logged to `console.error`
- **AND** other slots SHALL remain unaffected

---

### Requirement: Remote initialization SHALL happen before app render

The host bootstrap SHALL initialize the manifest loader and authentication before any MFE is mounted. There SHALL NOT be a "React render" step in the shell; MFE mount replaces the previous React root rendering.

**(Previously: React root render followed loader initialization)**

**Reason for change**: The shell no longer renders React. MFE mount is the first UI operation after bootstrap completes.

#### Scenario: Loader initialized before mount

- **GIVEN** the shell entry module is executing
- **WHEN** the bootstrap sequence runs
- **THEN** `loader.init()` SHALL complete
- **AND** the manifest SHALL be cached
- **AND** `tokenManager.initialize()` SHALL complete (success or failure recorded)
- **AND** `window.__MFE_AUTH__` SHALL be populated
- **THEN** MFE mount calls SHALL proceed

#### Scenario: Initialization error handled

- **GIVEN** `loader.init()` throws an error
- **WHEN** the bootstrap sequence runs
- **THEN** the error SHALL be caught
- **AND** the error SHALL be logged to `console.error`
- **AND** the shell SHALL render the critical-error template
- **AND** no MFE mounts SHALL be attempted

---

### Requirement: Host SHALL register navigation event listeners

The host SHALL listen for browser history changes and cross-MFE navigation events, then swap the feature MFE in `main-slot` accordingly. Chrome MFEs SHALL NOT be unmounted on route changes.

**(Previously: `NavigationEventListener` React component used React Router's `useNavigate`)**

**Reason for change**: React Router is removed from the shell. Route changes are handled by a vanilla bootstrap-level listener that maps URLs to MFEs via the manifest.

#### Scenario: Shell registers listener during bootstrap

- **GIVEN** the shell bootstrap sequence is running
- **WHEN** initial mount completes
- **THEN** the shell SHALL register a `popstate` listener on `window`
- **AND** the shell SHALL register a listener for the `mfe:navigate` custom event on the event bus

#### Scenario: Shell handles navigation event

- **GIVEN** the shell has registered its listeners
- **WHEN** an MFE dispatches `mfe:navigate` with `{ path: "/checkout/cart" }`
- **THEN** the shell SHALL call `history.pushState({}, '', '/checkout/cart')`
- **AND** the shell SHALL match `/checkout` from the manifest
- **AND** the shell SHALL unmount the previous feature MFE in `main-slot`
- **AND** the shell SHALL mount `mfe-checkout` into `main-slot`
- **AND** chrome MFEs SHALL remain mounted

#### Scenario: Shell handles browser back/forward

- **GIVEN** the user has navigated between `/widget` and `/dashboard`
- **WHEN** the browser fires a `popstate` event (back or forward button)
- **THEN** the shell SHALL re-match the current URL against the manifest
- **AND** the shell SHALL swap the feature MFE in `main-slot` if the match changed
- **AND** the shell SHALL leave chrome slots untouched

---

## REMOVED Requirements

### Requirement: Host SHALL integrate router with Suspense boundaries

**Reason**: React Router and `React.Suspense` are removed from the shell. Loading states are shown via a vanilla loading placeholder rendered directly into the target slot before the MFE mounts.

**Migration**: Replace React Suspense boundaries with slot-level loading placeholders injected by the loader before the MFE's `mount()` lifecycle completes. Custom loading components move into individual MFEs.

### Requirement: Host SHALL support route-based code splitting

**Reason**: The shell no longer uses React Router's `React.lazy()`. Code splitting still happens via Module Federation (each remote is a separate bundle loaded on demand), so the observable behavior is preserved without React Router.

**Migration**: No consumer change required. MFEs continue to be loaded on demand via `loader.loadRemote()`, which fetches `remoteEntry.js` only when the matching route is accessed.
