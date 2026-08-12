# module-federation-host Specification

## Purpose

This specification defines how the host application dynamically loads and integrates remote micro-frontends using Module Federation and the dynamic loader system. It covers configuration discovery, runtime loading, error handling, and development experience.

**Note on "manifest" terminology**: throughout this spec, "manifest" refers to the `remotes.config.json` artifact (`RemoteConfig` type from `@mfe-runtime/remote-config`), which is the config format currently fetched and served by the shell. This is distinct from the versioned `manifest.json` catalogue proposed by the `production-deployment-architecture` change, which is still in progress and not yet consumed at runtime.

## Requirements

### Requirement: Host application SHALL load federated modules

The host application SHALL dynamically load remote federated modules and mount them into named DOM slots via a vanilla JavaScript bootstrap sequence. The host SHALL NOT render React components directly; it only orchestrates slot-based MFE mounting.

**(Previously: Loaded via React Router lazy routes and React `Suspense` boundaries)**

**Reason for change**: The Chrome MFE pattern (ADR-0004) requires the shell to be a thin, framework-agnostic coordinator that mounts MFEs into fixed DOM slots. React Router and Suspense stay inside the MFEs; the shell uses vanilla JS to fetch manifest, match routes, and mount MFEs.

#### Scenario: Host initializes bootstrap and loader at startup

- **GIVEN** the host application is starting
- **WHEN** the entry module `apps/shells/website/src/main.ts` executes
- **THEN** the shell SHALL fetch `/remotes.config.json` (env-specific build copies it from `remotes.config.<env>.json`)
- **AND** the manifest SHALL be validated against the `@mfe-runtime/remote-config` JSON Schema
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

### Requirement: Remote loading SHALL use mfe-\* naming convention

The host application SHALL reference remotes using the `mfe-*` naming convention that matches auto-discovered package names.

#### Scenario: Host references remote by mfe-\* name

- **GIVEN** a micro-frontend package named `@mfe-runtime/mfe-widget`
- **WHEN** the host loads the remote
- **THEN** the remote SHALL be referenced as "mfe-widget"
- **AND** the loader SHALL find it in config by that name

#### Scenario: Old naming convention fails

- **GIVEN** the host attempts to load remote "remoteWidget"
- **WHEN** the loader searches the config
- **THEN** the loader SHALL NOT find a matching remote
- **AND** SHALL throw "Remote 'remoteWidget' not found in config"

### Requirement: Error boundaries SHALL display specific loader errors

The host application SHALL catch and display specific error messages for different loader failure scenarios.

#### Scenario: Config fetch error displayed

- **GIVEN** config fetch fails after retries
- **WHEN** error boundary catches the error
- **THEN** UI SHALL display "Failed to load remote configuration"
- **AND** SHALL include retry instruction
- **AND** error details SHALL be logged to console

#### Scenario: Remote not found error displayed

- **GIVEN** remote "mfe-dashboard" is not in config
- **WHEN** host attempts to load it
- **THEN** error boundary SHALL display "Remote 'mfe-dashboard' not found"
- **AND** SHALL suggest checking config file

#### Scenario: Remote disabled error displayed

- **GIVEN** remote is disabled in config
- **WHEN** host attempts to load it
- **THEN** error boundary SHALL display "Remote is currently disabled"
- **AND** SHALL suggest checking feature flags

#### Scenario: Script load error displayed

- **GIVEN** remote script URL returns 404
- **WHEN** loader attempts to inject script
- **THEN** error boundary SHALL display "Failed to load remote from {url}"
- **AND** error SHALL include network details

### Requirement: Loader events SHALL be logged in development

The host application SHALL log all dynamic loader lifecycle events to the console when running in development mode.

#### Scenario: Config load logged

- **GIVEN** app is running in development mode
- **WHEN** config loads successfully
- **THEN** console SHALL log "Remotes config loaded: {config}"
- **AND** log level SHALL be "log" (not error)

#### Scenario: Remote load success logged

- **GIVEN** app is running in development mode
- **WHEN** remote loads successfully
- **THEN** console SHALL log "Remote '{name}' loaded successfully"
- **AND** SHALL include remote name

#### Scenario: Remote load error logged

- **GIVEN** app is running in development mode
- **WHEN** remote fails to load
- **THEN** console SHALL log "Failed to load remote '{name}': {error}"
- **AND** log level SHALL be "error"
- **AND** SHALL include error details

#### Scenario: Production mode has no event logging

- **GIVEN** app is running in production mode
- **WHEN** loader events occur
- **THEN** console SHALL NOT log event messages
- **AND** only errors SHALL be logged

### Requirement: Static config SHALL be preserved as fallback

The host application SHALL maintain static Module Federation configuration (commented) as a documented fallback.

#### Scenario: Static config documented

- **GIVEN** vite.config.ts file
- **WHEN** developer reviews configuration
- **THEN** static remotes configuration SHALL be present
- **AND** SHALL be commented out
- **AND** SHALL include comment explaining fallback purpose

#### Scenario: Fallback can be activated

- **GIVEN** dynamic loader is failing
- **WHEN** developer uncomments static config
- **AND** rebuilds application
- **THEN** static config SHALL be used
- **AND** remotes SHALL load via hardcoded URLs

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

### Requirement: Loader instance SHALL be exported for component use

The host application SHALL export the loader instance so components can call loadRemote().

#### Scenario: Components import loader

- **GIVEN** a React component needs to load a remote
- **WHEN** component imports loader from config module
- **THEN** import SHALL succeed
- **AND** loader SHALL be the initialized singleton instance

#### Scenario: Multiple components use same loader

- **GIVEN** multiple components import the loader
- **WHEN** each component calls loader.loadRemote()
- **THEN** all SHALL use the same loader instance
- **AND** config SHALL be fetched only once
- **AND** remote containers SHALL be cached

### Requirement: Hot module reloading SHALL continue to work

The host application SHALL maintain hot module reload (HMR) functionality after dynamic loader integration.

#### Scenario: Host code changes trigger HMR

- **GIVEN** app is running in development mode
- **WHEN** developer edits host component code
- **THEN** HMR SHALL update the component
- **AND** page SHALL NOT full reload
- **AND** remote modules SHALL remain loaded

#### Scenario: Remote code changes trigger reload

- **GIVEN** app is running in development mode
- **WHEN** developer edits remote component code
- **THEN** remote SHALL rebuild
- **AND** HMR SHALL update the remote
- **AND** host SHALL reflect the changes

### Requirement: Integration tests SHALL verify end-to-end flow

The host application SHALL have integration tests verifying dynamic loading works correctly.

#### Scenario: Test config loads

- **GIVEN** integration test suite
- **WHEN** test runs loader initialization
- **THEN** config SHALL load without error
- **AND** test SHALL assert config structure is valid

#### Scenario: Test remote loads

- **GIVEN** integration test suite
- **WHEN** test loads "mfe-widget" remote
- **THEN** remote SHALL load successfully
- **AND** test SHALL assert container is returned
- **AND** test SHALL assert remote exports are accessible

#### Scenario: Test error scenarios

- **GIVEN** integration test suite
- **WHEN** test attempts to load non-existent remote
- **THEN** loader SHALL throw expected error
- **AND** test SHALL assert error message is correct

#### Scenario: Test widget renders

- **GIVEN** integration test suite
- **WHEN** test renders host with remote widget
- **THEN** widget component SHALL render
- **AND** test SHALL assert widget content is visible

### Requirement: Shared dependencies SHALL be configured

The host application SHALL configure shared dependencies to avoid duplicate loading of common libraries.

#### Scenario: React shared across host and remote

- **WHEN** both host and remote applications use React
- **THEN** the system SHALL load only one instance of React
- **AND** the version SHALL be determined by the host application

#### Scenario: Shared dependency version mismatch

- **WHEN** a remote module requires a different version of a shared dependency
- **THEN** the system SHALL log a warning to the console
- **AND** the system SHALL attempt to use the host's version
- **AND** if incompatible, the remote module SHALL fail gracefully with error boundary

### Requirement: Build process SHALL generate federation manifest

The host application build SHALL generate a Module Federation manifest for production deployments.

#### Scenario: Production build with federation

- **WHEN** running production build command
- **THEN** the system SHALL generate federation manifest files
- **AND** the output SHALL include remoteEntry.js
- **AND** the build SHALL complete without errors

### Requirement: TypeScript types SHALL be available for federated modules

The host application SHALL have TypeScript declarations for remotely loaded modules.

#### Scenario: Importing remote module with types

- **WHEN** importing a federated remote module in TypeScript
- **THEN** the TypeScript compiler SHALL recognize the module
- **AND** type checking SHALL work correctly
- **AND** IDE autocomplete SHALL function for remote module exports

### Requirement: Host SHALL load remote configuration at runtime

The host application SHALL fetch remote configurations from JSON files deployed as static assets.

#### Scenario: Config loaded on application init

- **WHEN** the host application initializes
- **THEN** the dynamic loader SHALL fetch `/remotes.config.json` (or environment-specific variant)
- **AND** the loader SHALL parse and validate the JSON
- **AND** validated config SHALL be cached for subsequent remote loads

#### Scenario: Environment-specific config preferred

- **WHEN** application runs in development environment
- **THEN** the loader SHALL attempt `/remotes.config.dev.json` first
- **AND** if not found, the loader SHALL fall back to `/remotes.config.json`

#### Scenario: Invalid config logged and ignored

- **WHEN** fetched config fails validation
- **THEN** the loader SHALL log validation errors to console
- **AND** the loader SHALL fall back to static configuration
- **AND** the loader SHALL emit "config-invalid" event

### Requirement: Host SHALL support adding remotes without rebuild

The host application SHALL allow operations teams to add or update remotes by deploying new config files without rebuilding the application bundle.

#### Scenario: New remote added via config update

- **WHEN** operations team deploys updated `/remotes.config.json` with new remote
- **AND** user refreshes the application
- **THEN** the new remote SHALL be available for loading
- **AND** no host application rebuild SHALL be required

#### Scenario: Remote URL updated via config

- **WHEN** operations team updates existing remote's entryUrl in config
- **AND** users load the application with new config
- **THEN** the updated URL SHALL be used for loading the remote
- **AND** no host application rebuild SHALL be required

### Requirement: Host SHALL emit telemetry events for remote loading

The host application SHALL emit events throughout remote loading lifecycle for monitoring and debugging.

#### Scenario: Config load events emitted

- **WHEN** loader fetches remote configuration
- **THEN** the system SHALL emit "config-load-start" and "config-load-success" events
- **AND** events SHALL include duration and remote count

#### Scenario: Remote load events emitted

- **WHEN** loading a remote module
- **THEN** the system SHALL emit "remote-load-start", "remote-load-success", or "remote-load-failed" events
- **AND** events SHALL include remoteName, duration, and source URL

#### Scenario: Event listeners registered

- **WHEN** developer registers event listener via `loader.on('remote-load-success', handler)`
- **THEN** handler SHALL be called when corresponding event occurs
- **AND** handler SHALL receive event data object

### Requirement: Host SHALL maintain backward compatibility with static config

The host application SHALL support both runtime JSON config and static vite.config.ts remotes for gradual migration.

#### Scenario: Static config used when JSON unavailable

- **WHEN** JSON config file returns 404 or fails validation
- **THEN** the system SHALL use remotes defined in vite.config.ts
- **AND** the system SHALL log that static fallback is active

#### Scenario: JSON config overrides static config

- **WHEN** both JSON config and static config define remotes
- **THEN** the system SHALL use JSON config
- **AND** static config SHALL only be used as fallback

### Requirement: Host build SHALL integrate with Turborepo pipeline

The host application SHALL use Turborepo for incremental builds with automatic config generation.

#### Scenario: Host build triggers config regeneration

- **WHEN** running `turbo build --filter website`
- **THEN** Turborepo SHALL run `generate:config` task first (depends on all mfe builds)
- **AND** Turborepo SHALL build host after config generated
- **AND** host SHALL include fresh config in build output

#### Scenario: Host uses cached build when nothing changed

- **WHEN** running `turbo build --filter website` with no code changes
- **THEN** Turborepo SHALL detect no changes via content hashing
- **AND** Turborepo SHALL serve host build from cache
- **AND** build SHALL complete in <1 second

#### Scenario: Host rebuilds when micro-frontend changes

- **WHEN** micro-frontend code changes
- **AND** running `turbo build`
- **THEN** Turborepo SHALL rebuild changed micro-frontend
- **AND** Turborepo SHALL regenerate config (depends on all mfes)
- **AND** Turborepo SHALL rebuild host (config changed)

#### Scenario: Host rebuilds when own code changes

- **WHEN** host application code changes (not micro-frontends)
- **AND** running `turbo build`
- **THEN** Turborepo SHALL rebuild host only
- **AND** micro-frontends SHALL be served from cache
- **AND** config generation SHALL be served from cache (if mfes unchanged)

### Requirement: Host SHALL define route configuration for MFEs

The host application SHALL maintain a route configuration that maps URL paths to micro-frontends.

#### Scenario: Route configuration maps paths to MFEs

- **GIVEN** host has route configuration
- **WHEN** configuration is defined
- **THEN** configuration SHALL include:
  - Route path (e.g., `/products/*`)
  - MFE name (e.g., `"mfe-products"`)
  - basePath to pass to MFE (e.g., `"/products"`)
  - Optional: authentication guards
  - Optional: authorization guards

#### Scenario: Route configuration is type-safe

- **GIVEN** route configuration is defined in TypeScript
- **WHEN** developer adds new route
- **THEN** TypeScript SHALL enforce required fields
- **AND** SHALL validate MFE names exist in config
- **AND** SHALL provide autocomplete for route options

---

### Requirement: Host SHALL pass basePath to loaded MFEs

The host application SHALL pass the basePath prop to each loaded micro-frontend.

#### Scenario: Host passes basePath matching route

- **GIVEN** route `/products/*` is configured
- **WHEN** host loads mfe-products at this route
- **THEN** host SHALL pass prop `basePath="/products"`
- **AND** mfe-products SHALL receive this prop in root component

#### Scenario: basePath matches route namespace

- **GIVEN** route `/checkout/*` loads mfe-checkout
- **WHEN** user navigates to `/checkout/cart`
- **THEN** basePath SHALL be `"/checkout"` (not `"/checkout/cart"`)
- **AND** MFE internal router SHALL handle `/cart` relative to basePath

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
