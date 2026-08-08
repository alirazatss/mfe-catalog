# Shell Kit

## ADDED Requirements

### Requirement: Shell runtime-config factory with override hooks

`@mfe-runtime/shell-kit` SHALL export a factory that produces a valid `ShellRuntimeConfig` from an `AppConfig` plus shell-specific options (failure renderer, slot bindings, navigation hooks), so shells declare only what differs instead of re-implementing the full config.

#### Scenario: Shell builds runtime config with defaults

- **GIVEN** a shell with a loaded `AppConfig`
- **WHEN** it calls the factory with only required options
- **THEN** the returned object satisfies the `ShellRuntimeConfig` contract from `@mfe-runtime/shell-runtime`
- **AND** `createShellRuntime` boots with it without errors

#### Scenario: Shell overrides the failure renderer

- **GIVEN** a shell supplying a custom failure renderer option
- **WHEN** an MFE fails to load at runtime
- **THEN** the custom renderer is invoked instead of the default one

### Requirement: Slot and critical-error rendering utilities

`@mfe-runtime/shell-kit` SHALL export slot rendering helpers (render-into-slot, not-found, access-denied, clear) and a critical-error renderer that operate on caller-provided element/template identifiers so shells with different markup can reuse them.

#### Scenario: Not-found rendered into a named slot

- **GIVEN** a document containing the shell's main slot element
- **WHEN** the not-found helper is called with that slot's identifier
- **THEN** the not-found content is rendered inside that element and any previous slot content is removed

#### Scenario: Critical error rendered when boot fails

- **GIVEN** a shell whose boot sequence throws before the runtime starts
- **WHEN** the critical-error renderer is invoked with the document root
- **THEN** a user-visible error UI replaces the app content and the error is logged

### Requirement: Auth bridge setup

`@mfe-runtime/shell-kit` SHALL export an auth-bridge setup function that populates the `window.__MFE_AUTH__` global per the ADR-0002 contract from a `TokenManager`, replacing per-shell copies.

#### Scenario: MFE reads tokens through the bridge

- **GIVEN** a shell that ran the shared auth-bridge setup with an authenticated `TokenManager`
- **WHEN** an MFE calls `window.__MFE_AUTH__.getAccessToken()`
- **THEN** it receives the current access token managed by the shell

#### Scenario: Bridge reflects logout

- **GIVEN** the bridge is set up and the user logs out
- **WHEN** an MFE queries authentication state via the bridge
- **THEN** the bridge reports unauthenticated and returns no token

### Requirement: Resilient config loaders

`@mfe-runtime/shell-kit` SHALL export config loaders that fetch the remotes manifest and the shell app-config with retry and caller-provided fallback, replacing per-shell fetch/retry implementations. JWT helper functions (`decodeJWT`, `userFromToken`, `hasRequiredRoles`) SHALL be provided by `@mfe-runtime/auth` and re-used by shells instead of local copies.

#### Scenario: Manifest fetched with retry then fallback

- **GIVEN** a manifest URL that fails for all retry attempts
- **WHEN** the manifest loader runs with a bundled fallback manifest
- **THEN** the loader resolves with the fallback manifest after exhausting retries
- **AND** a warning is logged

#### Scenario: App config dev fallback

- **GIVEN** a dev environment where `/app-config.json` is absent
- **WHEN** the app-config loader runs with a dev fallback config
- **THEN** it resolves with the fallback and the shell boots

#### Scenario: JWT helpers imported from auth package

- **GIVEN** the website shell after migration
- **WHEN** its sources are searched for local JWT decode implementations
- **THEN** none exist and roles/user extraction is imported from `@mfe-runtime/auth`
