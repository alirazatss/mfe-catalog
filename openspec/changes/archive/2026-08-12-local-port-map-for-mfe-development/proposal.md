## Why

Local development currently relies on ports being implicitly assigned or hardcoded per app, which makes shell-to-MFE wiring fragile when a preferred port is already in use. A canonical local port map will keep dev URLs stable, reduce manual edits, and let tooling resolve an alternate free port automatically when the preferred port is occupied.

## What Changes

- Introduce a canonical local port map for shells and MFEs used in development.
- Make local dev server startup read from the shared port map instead of relying on ad hoc or implicit port selection.
- Update discovery behavior so a micro-frontend's local port is resolved from the map consistently.
- Allow tooling to resolve an alternate free port when the preferred port is occupied and persist that resolved value back into the map.
- Keep generated local manifest URLs stable across runs.

## Capabilities

### New Capabilities

- `local-port-mapping`: define and use a canonical local port map for shells and MFEs so dev URLs remain stable and resolved ports stay in sync with local runtime state.

### Modified Capabilities

- `monorepo-discovery`: change local port resolution so discovery uses the canonical port map instead of implicit sequential assignment or silent port fallback.

## Impact

- Local development startup flow for shells and MFEs.
- Micro-frontend discovery and manifest/config generation inputs.
- Developer workflow when a port is already occupied.
- Specs and tests that currently assume alphabetical or implicit port allocation.
