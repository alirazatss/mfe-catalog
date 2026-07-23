## Why

Micro-frontends need environment-specific configuration (API base URLs, feature flags, CDN URLs) that changes between dev/staging/production without code changes. Currently, config is hardcoded or scattered across .env files. Shell and MFEs need a shared, type-safe configuration service that loads at runtime and provides the same config to all MFEs.

## What Changes

- **Config Package**: Create `@mfe-runtine/config` package with runtime configuration loader
- **Environment Detection**: Auto-detect environment from hostname or explicit override
- **Config Provider**: Shell loads config once at startup, shares with all MFEs via props and singleton
- **Type Safety**: TypeScript interfaces for all config values with IntelliSense support
- **Default Values**: Sensible defaults for development with environment-specific overrides

## Capabilities

### New Capabilities

- `runtime-config-loader`: Load JSON config file at app startup based on detected environment
- `config-service`: Singleton service providing type-safe access to configuration values
- `environment-detection`: Auto-detect dev/staging/production from hostname with manual override
- `config-provider`: Shell component initializing config and passing to MFEs

### Modified Capabilities

None - this is additive, doesn't modify existing capabilities

## Impact

**Affected Code**:

- `apps/shells/website/src/main.tsx` — Load config before rendering app
- `apps/mfes/mfe-widget/src/App.tsx` — Receive config from shell via props
- API clients will use `config.apiBaseUrl` instead of hardcoded URLs

**New Files**:

- `packages/config/` — New package for configuration
- `packages/config/src/ConfigService.ts` — Singleton config service
- `packages/config/src/types.ts` — TypeScript config interfaces
- `packages/config/src/loadConfig.ts` — Async config loader
- `public/config/config.dev.json` — Development config
- `public/config/config.staging.json` — Staging config (future)
- `public/config/config.production.json` — Production config (future)

**Infrastructure**:

- Config JSON files must be served from `/config/` path
- No backend changes required (static file serving)

**Breaking Changes**:

- None - this is additive, existing code continues to work
