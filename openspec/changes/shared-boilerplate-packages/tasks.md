# Tasks — Shared Boilerplate Packages

## Task Group 1: `@mfe-runtime/shell-kit` package + auth JWT helpers

- Owns files: `packages/shell-kit/**`, `packages/auth/**`, `pnpm-workspace.yaml` (no change expected; packages/ glob), root `turbo.json` (only if task wiring needed)
- Depends on: none
- Owner skills: `backend-developer`, `tester`
- Requirements: shell-kit / Shell runtime-config factory with override hooks; shell-kit / Slot and critical-error rendering utilities; shell-kit / Auth bridge setup; shell-kit / Resilient config loaders

1. [ ] Scaffold `packages/shell-kit` (package.json `@mfe-runtime/shell-kit`, tsconfig, exports map, build/test scripts matching repo conventions).
2. [ ] Move JWT helpers (`decodeJWT`, `userFromToken`, `hasRequiredRoles`) into `@mfe-runtime/auth` with unit tests (port logic from `apps/shells/website/src/shell/auth-helpers.ts`; do NOT edit the shell here).
3. [ ] Implement runtime-config factory with override hooks (failure renderer, slot bindings, navigation) returning a valid `ShellRuntimeConfig`; unit-test defaults and overrides.
4. [ ] Implement slot renderers (main/not-found/access-denied/clear) and critical-error renderer parameterized by element/template ids; unit-test with happy-dom.
5. [ ] Implement auth-bridge setup populating `window.__MFE_AUTH__` from a `TokenManager` per ADR-0002; unit-test token access and logout reflection.
6. [ ] Implement manifest loader (fetch + retry + fallback) and app-config loader (dev fallback); unit-test retry exhaustion and fallback paths.
7. [ ] Run package test suites and `vp check`; verify no imports from `apps/**`.

## Task Group 2: `createMFELifecycle` in dynamic-loader

- Owns files: `packages/dynamic-loader/**`
- Depends on: none
- Owner skills: `frontend-developer`, `tester`
- Requirements: dynamic-loader / MFE lifecycle helper

1. [ ] Add `createMFELifecycle({ Component })` producing `bootstrap`/`mount`/`unmount` with per-container root map and StrictMode wrapping, exposed via a subpath export with react as peer dependency.
2. [ ] Forward extended mount props to the component unchanged.
3. [ ] Unit tests: mount renders into container, remount replaces root, unmount cleans bookkeeping, extra props forwarded.
4. [ ] Verify existing `dynamic-loader` consumers are unaffected (package tests green, no main-entry API change).

## Task Group 3: Vite config factories in monorepo-tools

- Owns files: `packages/monorepo-tools/**`
- Depends on: none
- Owner skills: `backend-developer`, `architect`
- Requirements: build-config-factories / MFE Vite config factory; build-config-factories / Shell Vite config factory

1. [ ] Implement `createMFEViteConfig({ name, port, exposes, plugins?, cssCodeSplit?, bundleAllCSS? })` emitting the standard federation remote config with a single `optimizeDeps` block and shared react singletons.
2. [ ] Implement `createShellViteConfig({ shell, deployEnv })` covering the website shell's host config (asset copy, env-driven config selection).
3. [ ] Unit tests asserting produced config shape (federation options, ports, single optimizeDeps, override merge order with escape hatch applied last).
4. [ ] Document both factories in the package README/exports.

## Task Group 4: `@mfe-runtime/test-utils` package

- Owns files: `packages/test-utils/**`
- Depends on: none
- Owner skills: `tester`
- Requirements: shared-test-utils / Shared test mocks and render helpers; shared-test-utils / Vitest config preset

1. [ ] Scaffold `packages/test-utils` (name `@mfe-runtime/test-utils`, exports for `./vitest`, `./setup`, root mocks/helpers; deps limited to vitest/testing-library/react-router).
2. [ ] Port `mockAuthGlobal`, `clearAuthGlobal`, `mockUser` from mfe-widget's test folder (do NOT edit the MFE here) with unit tests.
3. [ ] Port `renderWithRouter` with unit tests.
4. [ ] Implement `createVitestConfig()` preset (happy-dom, v8 coverage, text/json/html reporters, standard exclusions) accepting threshold/setup-file overrides; test default and override behavior.
5. [ ] Guard against dependency cycles: assert package depends on no `apps/**` or app-facing runtime packages.

## Task Group 5: Migrate website shell

- Owns files: `apps/shells/website/**`
- Depends on: Task Group 1, Task Group 3, Task Group 4
- Owner skills: `frontend-developer`, `tester`
- Requirements: shell-kit / Resilient config loaders (JWT helpers scenario); shared-test-utils / Migrated apps consume shared test utils; build-config-factories / Migrated apps build identically

1. [ ] Replace `src/shell/auth-helpers.ts`, `auth-bridge.ts`, `critical-error.ts`, `slots.ts`, `manifest.ts`, `app-config.ts` usage with imports from `@mfe-runtime/shell-kit` / `@mfe-runtime/auth`; delete superseded local files.
2. [ ] Rewrite `src/shell/runtime-config.ts` as a thin call to the shell-kit factory passing website-specific options (failure renderer, slots).
3. [ ] Adopt `createShellViteConfig` in `vite.config.ts` and the test-utils vitest preset in `vitest.config.ts` (keep website coverage thresholds as overrides).
4. [ ] Update shell test files to import mocks/helpers from `@mfe-runtime/test-utils`; keep all existing suites green unchanged in behavior.
5. [ ] Verify build parity: production build succeeds with same output structure; `scripts/check-shell-size.ts` still passes.

## Task Group 6: Migrate MFEs

- Owns files: `apps/mfes/mfe-widget/**`, `apps/mfes/mfe-landing-page/**`
- Depends on: Task Group 2, Task Group 3, Task Group 4
- Owner skills: `frontend-developer`, `tester`
- Requirements: dynamic-loader / Existing MFEs migrate to the helper; build-config-factories / MFE Vite config factory; build-config-factories / Migrated apps build identically; shared-test-utils / Migrated apps consume shared test utils

1. [ ] Replace both MFEs' `bootstrap.ts` with thin `createMFELifecycle` wrappers (mfe-widget keeps its extended props forwarding).
2. [ ] Convert mfe-landing-page's standalone entry to the bootstrap-then-mount lifecycle pattern.
3. [ ] Adopt `createMFEViteConfig` in both vite configs (widget port 5174, landing-page 5175; landing-page keeps tailwind plugin + CSS options) — removes the duplicated `optimizeDeps` bug.
4. [ ] Adopt the test-utils vitest preset in both MFEs; move mfe-widget's local test mocks/utils to imports from `@mfe-runtime/test-utils` and delete local copies.
5. [ ] Run both MFE test suites and builds; verify `remoteEntry.js` emitted and dev-server ports unchanged.

## Task Group 7: Slim generator templates

- Owns files: `turbo/generators/**`
- Depends on: Task Group 1, Task Group 2, Task Group 3, Task Group 4
- Owner skills: `frontend-developer`, `team-lead`
- Requirements: app-scaffolding / Generated apps consume shared packages; app-scaffolding / Scaffolded apps remain buildable and testable

1. [ ] Update `templates/mfe` so generated `bootstrap.ts`, `vite.config.ts`, `vitest.config.ts` delegate to `createMFELifecycle`, `createMFEViteConfig`, and the test-utils preset.
2. [ ] Update `templates/shell` so generated boot sources import runtime-config factory, slots, critical-error, auth bridge, and loaders from `@mfe-runtime/shell-kit`, with only shell-specific options local.
3. [ ] Update generated `package.json.hbs` files to declare the consumed shared packages as workspace dependencies.
4. [ ] Scaffold a throwaway MFE and shell locally; verify install, build, and generated smoke tests pass, then remove them.
5. [ ] Confirm the drift-guard CI job passes with the slimmed templates.

## Execution Waves

- **Wave 1 (parallel)**: Task Group 1, Task Group 2, Task Group 3, Task Group 4
- **Wave 2 (parallel, after wave 1)**: Task Group 5, Task Group 6, Task Group 7
