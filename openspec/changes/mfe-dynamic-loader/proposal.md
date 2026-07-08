## Why

With config generation working, we need a runtime dynamic loader that fetches the generated config and loads micro-frontends dynamically, replacing hardcoded Module Federation imports.

## What Changes

- Create dynamic-loader package structure
- Implement config fetching from `/remotes.config.json` with retry logic
- Implement event system for telemetry
- Implement core DynamicLoader class with loadRemote() method
- Add support for fallback URLs, enabled flag, scope mapping

## Capabilities

### New Capabilities

- `dynamic-loader`: Runtime module loader that reads generated config and dynamically loads remotes

## Impact

### New Components

- `packages/dynamic-loader/` - Runtime loader package with config fetching, events, and Module Federation integration

### Deployment Changes

- None (package only, not integrated into host yet)
