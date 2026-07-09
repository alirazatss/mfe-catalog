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

### Requirement: Loader SHALL fetch config from JSON file at runtime

The system SHALL load remote configurations from static JSON files instead of hardcoded imports.

#### Scenario: Loader fetches config on initialization

- **WHEN** the host application initializes the dynamic loader
- **THEN** the loader SHALL make GET request to `/remotes.config.json` (or environment-specific variant)
- **AND** the loader SHALL parse JSON and cache configurations in memory
- **AND** subsequent remote loads SHALL use cached configurations

#### Scenario: Loader detects environment and loads appropriate config

- **WHEN** NODE_ENV=development
- **THEN** the loader SHALL attempt to load `/remotes.config.dev.json` first
- **AND** if dev config not found (404), the loader SHALL fall back to `/remotes.config.json`

#### Scenario: Config file not found falls back to static config

- **WHEN** config file fetch returns HTTP 404
- **THEN** the loader SHALL fall back to static configuration from `vite.config.ts` remotes
- **AND** the loader SHALL emit "config-fallback" warning event
- **AND** the loader SHALL log warning to console

#### Scenario: Config file fetch fails with network error

- **WHEN** config file fetch fails due to network error or timeout
- **THEN** the loader SHALL retry up to 2 times with 1-second delay
- **AND** if all retries fail, the loader SHALL fall back to static configuration
- **AND** the loader SHALL emit "config-fetch-failed" error event

### Requirement: Loader SHALL validate config before use

The system SHALL validate fetched config against schema before loading any remotes.

#### Scenario: Valid config used immediately

- **WHEN** fetched config passes validation
- **THEN** the loader SHALL mark config as ready
- **AND** remote load requests SHALL proceed using config

#### Scenario: Invalid config triggers fallback

- **WHEN** fetched config fails validation
- **THEN** the loader SHALL NOT use invalid config
- **AND** the loader SHALL fall back to static configuration
- **AND** validation errors SHALL be logged to console.error
- **AND** the loader SHALL emit "config-invalid" error event

### Requirement: Loader SHALL dynamically import remotes from config

The system SHALL use dynamic import to load remote modules based on config URLs.

#### Scenario: Remote loaded from config URL

- **WHEN** application requests remote named "widgetA"
- **THEN** the loader SHALL look up "widgetA" in config
- **AND** the loader SHALL dynamically import from config's entryUrl
- **AND** the loader SHALL return loaded module to caller

#### Scenario: Remote not found in config

- **WHEN** application requests remote that doesn't exist in config
- **THEN** the loader SHALL return error "Remote '{name}' not found in configuration"
- **AND** the loader SHALL NOT attempt to load any URL
- **AND** the loader SHALL emit "remote-not-found" error event

### Requirement: Loader SHALL support fallback URLs

The system SHALL attempt fallback URLs when primary entry URL fails to load.

#### Scenario: Primary URL loads successfully

- **WHEN** loading remote with entryUrl and fallbackUrls configured
- **THEN** the loader SHALL attempt entryUrl first
- **AND** if successful, fallbackUrls SHALL NOT be attempted
- **AND** the loader SHALL emit "remote-loaded" event with source URL

#### Scenario: Primary URL fails, fallback succeeds

- **WHEN** primary entryUrl fails with network error or 404
- **THEN** the loader SHALL attempt first fallbackUrl
- **AND** if fallback succeeds, the loader SHALL return loaded module
- **AND** the loader SHALL emit "fallback-used" event with fallback index
- **AND** the loader SHALL log warning about primary failure

#### Scenario: All URLs fail

- **WHEN** primary entryUrl and all fallbackUrls fail to load
- **THEN** the loader SHALL return error "Failed to load remote '{name}' from all URLs"
- **AND** the loader SHALL emit "remote-load-failed" error event with all attempted URLs
- **AND** error boundary SHALL display fallback UI

### Requirement: Loader SHALL respect enabled flag

The system SHALL skip loading remotes marked as disabled in config.

#### Scenario: Enabled remote loads normally

- **WHEN** remote config has `enabled: true` or no enabled field (default true)
- **THEN** the loader SHALL load the remote when requested

#### Scenario: Disabled remote skipped

- **WHEN** remote config has `enabled: false`
- **THEN** the loader SHALL NOT load the remote
- **AND** the loader SHALL return error "Remote '{name}' is disabled in configuration"
- **AND** the loader SHALL emit "remote-disabled" event

### Requirement: Loader SHALL emit telemetry events

The system SHALL emit detailed events throughout loading lifecycle for monitoring and debugging.

#### Scenario: Config load start event

- **WHEN** loader begins fetching config file
- **THEN** the loader SHALL emit "config-load-start" event with timestamp and config URL

#### Scenario: Config load success event

- **WHEN** config file loads and validates successfully
- **THEN** the loader SHALL emit "config-load-success" event with duration, remote count, and environment

#### Scenario: Remote load start event

- **WHEN** loader begins loading remote module
- **THEN** the loader SHALL emit "remote-load-start" event with remoteName, entryUrl, and timestamp

#### Scenario: Remote load success event with timing

- **WHEN** remote module loads successfully
- **THEN** the loader SHALL emit "remote-load-success" event with remoteName, duration, and source URL
- **AND** duration SHALL be in milliseconds

#### Scenario: Remote load failure event

- **WHEN** remote fails to load after all retries
- **THEN** the loader SHALL emit "remote-load-failed" event with remoteName, error message, attempted URLs, and duration
- **AND** event SHALL include stack trace if available

#### Scenario: Fallback usage event

- **WHEN** loader uses fallback URL after primary fails
- **THEN** the loader SHALL emit "fallback-used" event with remoteName, primary URL, fallback URL, and reason

### Requirement: Loader SHALL handle concurrent remote loads

The system SHALL manage loading multiple remotes simultaneously without race conditions.

#### Scenario: Parallel remote loading

- **WHEN** multiple remotes are requested simultaneously
- **THEN** the loader SHALL initiate parallel fetch operations
- **AND** each remote SHALL load independently
- **AND** failure of one remote SHALL NOT block others

#### Scenario: Duplicate load requests deduplicated

- **WHEN** same remote is requested multiple times before first load completes
- **THEN** the loader SHALL return same Promise for all requests
- **AND** only one network request SHALL be made
- **AND** all callers SHALL receive same loaded module

### Requirement: Loader SHALL support lazy loading

The system SHALL defer loading remotes until they are actually needed.

#### Scenario: Remote loaded on demand

- **WHEN** application calls `loader.loadRemote('widgetA')`
- **THEN** the loader SHALL begin loading only at that moment
- **AND** the loader SHALL NOT preload remotes on initialization

#### Scenario: Preload specific remotes

- **WHEN** application calls `loader.preload(['widgetA', 'widgetB'])`
- **THEN** the loader SHALL begin loading specified remotes
- **AND** loaded modules SHALL be cached for instant access later

### Requirement: Loader SHALL expose programmatic API

The system SHALL provide TypeScript API for imperatively managing remotes.

#### Scenario: Load remote via API

- **WHEN** calling `await loader.loadRemote('widgetA')`
- **THEN** the loader SHALL return Promise resolving to loaded module exports
- **AND** Promise SHALL reject if loading fails after all retries

Example:

```typescript
const loader = new DynamicLoader();
await loader.init();

try {
  const { CounterWidget } = await loader.loadRemote("remoteWidget");
  const widget = new CounterWidget(container, options);
} catch (error) {
  console.error("Failed to load remote:", error);
}
```

#### Scenario: Check remote load status

- **WHEN** calling `loader.getStatus('widgetA')`
- **THEN** the loader SHALL return current status: 'idle' | 'loading' | 'loaded' | 'failed'
- **AND** status SHALL include error details if failed

#### Scenario: Reload config at runtime

- **WHEN** calling `await loader.reloadConfig()`
- **THEN** the loader SHALL fetch fresh config from JSON file
- **AND** new remotes SHALL be available immediately
- **AND** already-loaded remotes SHALL remain cached

#### Scenario: Clear remote cache

- **WHEN** calling `loader.clearCache('widgetA')`
- **THEN** the loader SHALL remove module from cache
- **AND** next load request SHALL fetch fresh module

### Requirement: Loader SHALL support cache-busting

The system SHALL allow bypassing CDN cache when fetching config files.

#### Scenario: Config fetched with cache-busting query param

- **WHEN** loader is configured with `cacheBust: true`
- **THEN** config SHALL be fetched as `/remotes.config.json?v={timestamp}`
- **AND** timestamp SHALL be current time to bypass cache

#### Scenario: Config fetched with build-time version

- **WHEN** loader is initialized with `configVersion` option
- **THEN** config SHALL be fetched as `/remotes.config.json?v={configVersion}`
- **AND** version SHALL be from environment variable or build metadata

### Requirement: Loader SHALL provide error recovery

The system SHALL handle errors gracefully and provide recovery mechanisms.

#### Scenario: Retry failed remote load

- **WHEN** calling `await loader.retry('widgetA')` after load failure
- **THEN** the loader SHALL attempt to load remote again
- **AND** the loader SHALL use all configured URLs (primary + fallbacks)

#### Scenario: Fallback to static import on complete failure

- **WHEN** dynamic loading fails and static import is configured
- **THEN** the loader SHALL attempt static import as last resort
- **AND** static import SHALL only be available if remote is bundled with host

### Requirement: Loader SHALL support TypeScript types

The system SHALL provide full TypeScript type safety for loaded modules.

#### Scenario: Type-safe remote imports

- **WHEN** developer uses loader in TypeScript project
- **THEN** loaded module exports SHALL be fully typed
- **AND** TypeScript SHALL provide autocomplete for module exports

Example:

```typescript
import type { CounterWidget } from "remoteWidget/CounterWidget";

const { CounterWidget } = await loader.loadRemote<{
  CounterWidget: typeof CounterWidget;
}>("remoteWidget");

// CounterWidget is now fully typed
const widget = new CounterWidget(container, {
  initialValue: 10, // TypeScript validates options
});
```

### Requirement: Loader SHALL handle module scope mapping

The system SHALL map remote names to Module Federation scope names correctly.

#### Scenario: Scope name used for import

- **WHEN** config specifies remote with `name: "widgetA"` and `scope: "remoteWidgetScope"`
- **THEN** the loader SHALL use scope name for Module Federation imports
- **AND** the loader SHALL load from `remoteWidgetScope/CounterWidget` not `widgetA/CounterWidget`

#### Scenario: Default scope when not specified

- **WHEN** remote config omits `scope` field
- **THEN** the loader SHALL default scope to same value as `name`
- **AND** the loader SHALL emit warning if name and scope should differ

### Requirement: Loader SHALL integrate with React Router lazy loading

The dynamic loader SHALL work seamlessly with React's lazy() function and React Router's route loaders.

#### Scenario: Loader used with React.lazy()

- **GIVEN** route configuration uses React.lazy()
- **WHEN** lazy component factory calls `loader.loadRemote("mfe-products")`
- **THEN** loader SHALL return Promise resolving to module container
- **AND** React SHALL wait for promise resolution
- **AND** SHALL render Suspense fallback during loading
- **AND** SHALL render MFE component once loaded

#### Scenario: Loader used in route loader function

- **GIVEN** React Router route has loader function
- **WHEN** loader function calls `await loader.loadRemote("mfe-products")`
- **THEN** dynamic loader SHALL return remote container
- **AND** route loader SHALL extract module from container
- **AND** SHALL return module to React Router
- **AND** React Router SHALL render component

#### Scenario: Loader throws error caught by router error boundary

- **GIVEN** route loader calls `loader.loadRemote("invalid-mfe")`
- **WHEN** loader throws error (remote not found)
- **THEN** React Router SHALL catch error
- **AND** SHALL render errorElement component
- **AND** error boundary SHALL display user-friendly message

---

### Requirement: Loader SHALL cache remote containers per route

The dynamic loader SHALL cache loaded remote containers to optimize repeated route access.

#### Scenario: MFE loaded on first route access

- **GIVEN** user navigates to `/products/list` for first time
- **WHEN** loader.loadRemote("mfe-products") is called
- **THEN** loader SHALL fetch mfe-products remoteEntry.js
- **AND** SHALL initialize Module Federation container
- **AND** SHALL cache container in memory
- **AND** SHALL return container

#### Scenario: MFE retrieved from cache on second route access

- **GIVEN** mfe-products was loaded previously
- **AND** user navigates away and returns to `/products/list`
- **WHEN** loader.loadRemote("mfe-products") is called again
- **THEN** loader SHALL return cached container
- **AND** SHALL NOT re-fetch remoteEntry.js
- **AND** SHALL NOT re-initialize container

#### Scenario: Cache cleared manually

- **GIVEN** MFEs are cached in memory
- **WHEN** loader.clearCache() is called
- **THEN** all cached remote containers SHALL be removed
- **AND** next loadRemote() call SHALL fetch fresh

---

### Requirement: Loader SHALL emit events for route-based loading

The dynamic loader SHALL emit events when MFEs are loaded via routing.

#### Scenario: Event emitted when route loader starts

- **GIVEN** user navigates to `/products/list`
- **WHEN** route loader calls loader.loadRemote("mfe-products")
- **THEN** loader SHALL emit `remote:load:start` event
- **AND** event detail SHALL include `{ name: "mfe-products" }`

#### Scenario: Event emitted when route loading succeeds

- **GIVEN** route loader successfully loads mfe-products
- **WHEN** loading completes
- **THEN** loader SHALL emit `remote:load:success` event
- **AND** event detail SHALL include `{ name: "mfe-products" }`

#### Scenario: Event emitted when route loading fails

- **GIVEN** route loader attempts to load "invalid-mfe"
- **WHEN** loading fails
- **THEN** loader SHALL emit `remote:load:error` event
- **AND** event detail SHALL include `{ name: "invalid-mfe", error: Error }`

---

### Requirement: Loader SHALL support route guards integration

The dynamic loader SHALL work with route guard functions that check authentication/authorization before loading MFEs.

#### Scenario: Loader called after guard passes

- **GIVEN** route has authentication guard
- **AND** guard passes (user is authenticated)
- **WHEN** route loader calls loader.loadRemote("mfe-products")
- **THEN** loader SHALL load mfe-products
- **AND** SHALL return container normally

#### Scenario: Loader NOT called if guard fails

- **GIVEN** route has authentication guard
- **AND** guard fails (user not authenticated)
- **WHEN** guard redirects to `/auth/login`
- **THEN** route loader SHALL NOT execute
- **AND** loader.loadRemote() SHALL NOT be called
- **AND** MFE SHALL NOT be fetched

---

### Requirement: Loader SHALL provide status for route configuration

The dynamic loader SHALL expose status information useful for route configuration and debugging.

#### Scenario: Status includes loaded remotes

- **GIVEN** mfe-products and mfe-checkout have been loaded
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `loadedRemotes: ["mfe-products", "mfe-checkout"]`

#### Scenario: Status includes failed remotes

- **GIVEN** loading "mfe-invalid" failed previously
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `failedRemotes: ["mfe-invalid"]`

#### Scenario: Status shows config loaded state

- **GIVEN** config has been fetched and cached
- **WHEN** loader.getStatus() is called
- **THEN** status SHALL include `configLoaded: true`

---

### Requirement: Loader SHALL handle concurrent route requests

The dynamic loader SHALL correctly handle multiple simultaneous route navigation requests.

#### Scenario: Same MFE requested twice concurrently

- **GIVEN** two routes both use mfe-products
- **WHEN** both routes are accessed nearly simultaneously
- **THEN** loader SHALL fetch mfe-products only once
- **AND** SHALL return same promise to both callers
- **AND** SHALL cache container after first load completes

#### Scenario: Different MFEs requested concurrently

- **GIVEN** user opens `/products/list` and `/checkout/cart` in quick succession
- **WHEN** both route loaders execute
- **THEN** loader SHALL fetch mfe-products AND mfe-checkout in parallel
- **AND** SHALL not block one on the other
- **AND** SHALL cache both containers

---

### Requirement: Loader SHALL work with route preloading

The dynamic loader SHALL support React Router's route preloading for better UX.

#### Scenario: MFE preloaded on link hover

- **GIVEN** user hovers over link to `/products/list`
- **WHEN** React Router preloads the route
- **AND** route loader executes loader.preload("mfe-products")
- **THEN** loader SHALL fetch mfe-products in background
- **AND** SHALL cache container
- **AND** SHALL NOT render MFE yet

#### Scenario: Preloaded MFE renders instantly on navigation

- **GIVEN** mfe-products was preloaded on link hover
- **WHEN** user clicks link and navigates to `/products/list`
- **THEN** route loader SHALL use cached container
- **AND** MFE SHALL render immediately (no loading state)
- **AND** UX SHALL be smooth

---

### Requirement: Loader SHALL support route-based configuration overrides

The dynamic loader SHALL allow routes to specify loading options per MFE.

#### Scenario: Route specifies custom retry for MFE

- **GIVEN** route loader calls `loader.loadRemote("mfe-products", { maxRetries: 5 })`
- **WHEN** loading fails
- **THEN** loader SHALL retry up to 5 times (not default 3)

#### Scenario: Route specifies timeout for MFE

- **GIVEN** route loader calls `loader.loadRemote("mfe-analytics", { timeout: 10000 })`
- **WHEN** loading exceeds 10 seconds
- **THEN** loader SHALL timeout and throw error
