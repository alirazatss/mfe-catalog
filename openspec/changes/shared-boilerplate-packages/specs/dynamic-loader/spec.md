# Dynamic Loader

## ADDED Requirements

### Requirement: MFE lifecycle helper

`@mfe-runtime/dynamic-loader` SHALL export a `createMFELifecycle` helper that, given a React component (and optional prop-mapping), returns `bootstrap`, `mount`, and `unmount` functions conformant with the MFE lifecycle contract (ADR-0007), including per-container React root management and StrictMode wrapping.

#### Scenario: MFE exports lifecycle via helper

- **GIVEN** an MFE whose `bootstrap.ts` re-exports the result of `createMFELifecycle({ Component: App })`
- **WHEN** a shell loads the MFE and calls `bootstrap()` then `mount(props)`
- **THEN** the component renders into `props.container` wrapped in StrictMode

#### Scenario: Remount into the same container

- **GIVEN** a mounted MFE created via the helper
- **WHEN** `mount` is called again with the same container
- **THEN** the previous root is unmounted before the new render, leaving exactly one active root for that container

#### Scenario: Unmount cleans up

- **GIVEN** a mounted MFE created via the helper
- **WHEN** `unmount(props)` is called with the mounted container
- **THEN** the React root is unmounted and its bookkeeping entry removed

#### Scenario: Extra props forwarded to the component

- **GIVEN** an MFE whose component consumes extended props (e.g., `user`)
- **WHEN** the shell passes those props to `mount`
- **THEN** the helper forwards them to the component unchanged

### Requirement: Existing MFEs migrate to the helper

mfe-widget and mfe-landing-page SHALL replace their hand-written `bootstrap.ts` implementations with `createMFELifecycle`, and mfe-landing-page's standalone entry SHALL adopt the lifecycle pattern (bootstrap-then-mount) instead of direct rendering.

#### Scenario: No hand-rolled root maps remain

- **GIVEN** the migrated MFEs
- **WHEN** their sources are searched for local `Map<HTMLElement, Root>` lifecycle implementations
- **THEN** none exist and each `bootstrap.ts` is a thin `createMFELifecycle` wrapper

#### Scenario: Standalone dev harness parity

- **GIVEN** the migrated mfe-landing-page
- **WHEN** it runs standalone via its dev server
- **THEN** the app renders by calling the lifecycle `bootstrap` and `mount` like mfe-widget does
