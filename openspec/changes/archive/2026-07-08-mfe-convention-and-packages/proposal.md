## Why

Following the Turborepo setup, we need to adopt the `apps/mfes/mfe-*` naming convention for micro-frontends and create the foundational packages (`monorepo-tools` and `remote-config`) that will enable auto-discovery and config generation.

## What Changes

- Rename `apps/mfes/remote-widget/` to `apps/mfes/mfe-widget/` to follow convention
- Update all references to use new name
- Create `packages/monorepo-tools/` package structure with TypeScript setup
- Create `packages/remote-config/` package structure with JSON Schema and validation

## Capabilities

### Modified Capabilities

- `microfrontend-sample`: Rename to follow `mfe-*` naming convention

### New Capabilities

- `monorepo-tools-structure`: Package structure for discovery and config generation utilities
- `remote-config-structure`: Package structure for JSON Schema and validation

## Impact

### Affected Code

- `apps/mfes/remote-widget/` → `apps/mfes/mfe-widget/`
- `apps/mfes/mfe-widget/package.json` - Update name to `@mfe-runtine/mfe-widget`
- Root `package.json` - Update scripts (dev:remote → dev:mfe-widget)
- Host imports - Update references

### New Components

- `packages/monorepo-tools/` - Package skeleton with TypeScript
- `packages/remote-config/` - Package skeleton with JSON Schema Draft 7

### Deployment Changes

- None (structural setup only)
