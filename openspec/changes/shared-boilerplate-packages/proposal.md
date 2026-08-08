# Shared Boilerplate Packages

## Why

A codebase-wide duplication audit found that every new shell copies ~390+ LoC and every new MFE copies ~150+ LoC of identical boilerplate that belongs in shared packages:

- **Shell boilerplate** (`apps/shells/website/src/shell/`): JWT helpers (`decodeJWT`, `userFromToken`, `hasRequiredRoles`), auth-bridge setup (`window.__MFE_AUTH__` per ADR-0002), slot renderers, critical-error renderer, the `ShellRuntimeConfig` factory, and manifest/app-config fetch-with-retry loaders are all shell-local despite containing zero shell-specific logic.
- **MFE lifecycle** (`src/bootstrap.ts`): 95% identical between mfe-landing-page and mfe-widget — the same `Map<HTMLElement, Root>` mount/unmount pattern is re-implemented per MFE and re-copied by the generator template.
- **Vite configs**: Module Federation setup is ~60% copy-pasted per MFE; mfe-widget carries a duplicated `optimizeDeps` block (latent bug); shell vite config is ~110 LoC of repeatable setup.
- **Test infrastructure**: the vitest coverage block is repeated near-identically ~9 times across the repo; auth mocks and `renderWithRouter` exist only in mfe-widget, leaving other apps without test scaffolding.

The `app-scaffolding` generator currently bakes this duplication into every newly scaffolded app. Extracting first means generator templates become thin wrappers, and fixes propagate via package updates instead of N copies.

## What Changes

- **New package `@mfe-runtime/shell-kit`**: shell runtime-config factory (with shell-specific override hooks), slot renderers, critical-error renderer, auth-bridge setup, and config loaders (manifest fetch-with-retry, app-config load with dev fallback).
- **Extend `@mfe-runtime/auth`**: absorb pure JWT helpers (`decodeJWT`, `userFromToken`, `hasRequiredRoles`) from the website shell.
- **Extend `@mfe-runtime/dynamic-loader`**: add `createMFELifecycle(Component)` helper producing conformant `bootstrap`/`mount`/`unmount` exports (ADR-0007).
- **Extend `@mfe-runtime/monorepo-tools`**: add `createMFEViteConfig()` and `createShellViteConfig()` factories (parameterized name/port/exposes/plugins), eliminating per-app federation copy-paste and the duplicated `optimizeDeps` bug.
- **New package `@mfe-runtime/test-utils`**: auth global mocks, `renderWithRouter`, vitest setup entry, and `createVitestConfig()` preset encapsulating the repeated coverage block.
- **Migrate consumers**: website shell and both MFEs import from the new packages; local duplicated files are deleted; existing tests stay green.
- **Update generator templates**: `turbo/generators/templates/{mfe,shell}` emit thin wrappers that consume the shared packages; drift guard continues to pass.

Out of scope: axios auth API client extraction, shared base tsconfigs, GitHub composite actions, `presentation/` folder alignment.

## Capabilities

### New

- `shell-kit`: shared shell bootstrapping utilities — runtime-config factory with override hooks, slot rendering, critical-error rendering, auth-bridge setup, and resilient config loaders consumed by every shell.
- `shared-test-utils`: shared test infrastructure — auth mocks, router-aware render helper, vitest setup, and a vitest config preset consumed by apps and packages.
- `build-config-factories`: parameterized Vite config factories for MFEs (Module Federation remote) and shells (host), exported from `@mfe-runtime/monorepo-tools`.

### Modified

- `dynamic-loader`: gains a `createMFELifecycle` helper that generates the standard lifecycle exports from a React component.
- `app-scaffolding`: generator templates change from full-boilerplate copies to thin wrappers importing the shared packages.

## Impact

- **New packages**: `packages/shell-kit/`, `packages/test-utils/` (workspace + turbo wiring).
- **Modified packages**: `packages/auth` (JWT helpers), `packages/dynamic-loader` (lifecycle helper), `packages/monorepo-tools` (vite factories).
- **Migrated apps**: `apps/shells/website` (deletes ~7 local shell files in favor of imports), `apps/mfes/mfe-widget`, `apps/mfes/mfe-landing-page` (bootstrap + vite config + test infra).
- **Generator**: `turbo/generators/templates/{mfe,shell}` templates shrink; `turbo/generators/config.mjs` unchanged in behavior.
- **Risk**: behavioral regression during migration — mitigated by migrating with existing test suites green and the scaffolding drift guard; per-shell branding/layout hooks must remain overridable (factory accepts shell-specific options rather than hardcoding).
