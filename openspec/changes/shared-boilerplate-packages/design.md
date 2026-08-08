# Design — Shared Boilerplate Packages

## Context

An audit found ~390 LoC of shell boilerplate and ~150 LoC of MFE boilerplate duplicated (or destined for duplication via generator templates). The `mfe-shell-scaffolding` generator currently copies this boilerplate into every new app. Extraction must precede or accompany template slimming so fixes ship once.

## Decisions

### 1. One `shell-kit` package instead of several small packages

Slot rendering, critical-error rendering, auth-bridge setup, config loaders, and the runtime-config factory always ship together in a shell — splitting them into `config-loaders`/`shell-bootstrap-kit`/etc. would create N packages with a single consumer type and cross-dependencies. One cohesive `@mfe-runtime/shell-kit` keeps the dependency graph flat. Pure JWT helpers are the exception: they belong with token concerns in the existing `@mfe-runtime/auth`.

- **Alternative rejected**: multiple micro-packages — more publishing/wiring overhead for no isolation benefit.
- **Alternative rejected**: pushing everything into `shell-runtime` — that package is the runtime _contract_ and orchestrator; mixing opinionated helpers with the contract would force MFE-facing consumers to pull in DOM/render helpers.

### 2. Factories with override hooks, not inheritance or copies

`createShellRuntimeConfig(appConfig, options)` takes shell-specific behavior (failure renderer, slot bindings) as explicit options with sensible defaults. Same pattern for `createMFEViteConfig` / `createShellViteConfig` / `createVitestConfig`. This keeps shell-specific things (branding, layout, thresholds) local while sharing everything else, and mirrors the pattern already proven by `createShellRuntime`.

### 3. `createMFELifecycle` lives in `dynamic-loader`

The MFE lifecycle contract types (`MFEProps`, `MFELifecycle`) already live there; the helper is the producer side of the same contract. A new package for 40 LoC is not justified. React becomes a peer dependency for the helper entry point only (subpath export) so non-React consumers of `dynamic-loader` are unaffected.

### 4. Vite factories live in `monorepo-tools`

`monorepo-tools` already owns discovery and config generation (ports, scopes). The vite factories consume the same conventions (port assignment, scope naming), so co-locating avoids a circular relationship between a new `vite-config` package and `monorepo-tools`.

### 5. Migrate consumers in the same change

Extraction without migration leaves the duplication in place and the packages untested by real consumers. Website + both MFEs migrate here, with their existing test suites and the drift guard acting as the regression net. Build parity (same output structure, same ports) is a spec requirement, not an aspiration.

### 6. Templates become thin wrappers now, not later

The generator templates are the main duplication amplifier. Updating them in this change (rather than a follow-up) prevents scaffolding new apps from the old boilerplate during the gap. The drift guard already exercises template → build → test, so template regressions surface in CI.

## Package Layout

```
packages/
├── shell-kit/            # NEW: runtime-config factory, slots, critical-error,
│                         #      auth-bridge setup, manifest/app-config loaders
├── test-utils/           # NEW: mocks, renderWithRouter, vitest preset, setup entry
├── auth/                 # + jwt helpers (decodeJWT, userFromToken, hasRequiredRoles)
├── dynamic-loader/       # + createMFELifecycle (subpath export, react peer dep)
└── monorepo-tools/       # + createMFEViteConfig, createShellViteConfig
```

## Risks / Trade-offs

- **Behavioral drift during migration** — mitigated: consumer test suites must pass unchanged; build/port parity is spec'd.
- **`test-utils` as devDependency cycle risk** — `test-utils` must not depend on app packages; it depends only on vitest/testing-library/react-router.
- **Over-abstraction of vite configs** — factories expose an escape hatch (extra plugins, overrides merged last) so an app can diverge without forking the factory.
- **`ccis` shell references** — only the website shell exists on disk today; migration scope is website + 2 MFEs.

## Rollout

Single change, no runtime flags. Packages land first (wave 1), consumers + templates migrate on top (wave 2+). No deployment pipeline changes; CI (tests, drift guard, shell-size check) is the gate.
