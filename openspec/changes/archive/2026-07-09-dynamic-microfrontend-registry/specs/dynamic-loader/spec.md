# dynamic-loader Specification

## Purpose

Provides a runtime module loader that reads remote configurations from JSON files, handles loading errors gracefully, supports fallback URLs, and emits events for monitoring.

## ADDED Requirements

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
