## 1. Loader Types & Validation

- [ ] 1.1 Create `packages/dynamic-loader/src/lifecycle.ts` exporting `MFEProps` and `MFELifecycle` TypeScript interfaces
- [ ] 1.2 Export `MFELifecycle` and `MFEProps` from `packages/dynamic-loader/src/index.ts`
- [ ] 1.3 Add `validateLifecycleModule(module, mfeName)` helper that throws with a diagnostic when required exports are missing
- [ ] 1.4 Add unit tests covering: valid module, missing `bootstrap`, missing `mount`, missing `unmount`, `update` optional, default export vs named exports

## 2. Loader Lifecycle Orchestration

- [ ] 2.1 Update `packages/dynamic-loader/src/DynamicLoader.ts` to maintain an `instances: Map<string, MFEInstance>` (tracking `bootstrapped`, `mounted`, `container`, `props`, `lifecycle`)
- [ ] 2.2 Implement `loader.load(name, slotId, props)` that: resolves container, unloads previous MFE in slot if different, dynamically imports `./lifecycle`, validates exports, calls `bootstrap` (first time only), calls `mount`
- [ ] 2.3 Implement `loader.unload(name)` that calls `unmount` and clears the container innerHTML
- [ ] 2.4 Implement `loader.update(name, partialProps)` that: merges props, calls `update` if available, otherwise falls back to `unmount` then `mount`
- [ ] 2.5 Ensure single-slot invariant: only one MFE mounted per slot at a time
- [ ] 2.6 Emit lifecycle events on the shared event bus for each phase (`start`, `success`, `error`)

## 3. Loader Tests

- [ ] 3.1 Unit tests for `load` happy path (bootstrap called once, mount called, container populated)
- [ ] 3.2 Unit tests for `load` repeat (bootstrap NOT called on second mount)
- [ ] 3.3 Unit tests for `load` when slot already occupied (previous MFE unmounted first)
- [ ] 3.4 Unit tests for `unload` (unmount called, container cleared, `mounted: false` recorded)
- [ ] 3.5 Unit tests for `update` with `update` present (no unmount, DOM identity preserved)
- [ ] 3.6 Unit tests for `update` without `update` (unmount+mount fallback)
- [ ] 3.7 Unit tests for validation failure (missing exports produce clear error, no mount attempted)
- [ ] 3.8 Unit tests for `bootstrap` failure (mount not called, error surfaced)
- [ ] 3.9 Unit tests for event emissions on happy path and error path

## 4. Sample MFE Wrapper

- [ ] 4.1 Create `apps/mfe-widget/src/index.tsx` implementing the lifecycle
- [ ] 4.2 In `mount`, create React root via `createRoot(props.container)`; render `<StrictMode><App {...props} /></StrictMode>`; store root reference at module scope
- [ ] 4.3 In `unmount`, call `root.unmount()`, null the reference, clear any subscriptions
- [ ] 4.4 In `update`, re-render into the same root with merged props
- [ ] 4.5 In `bootstrap`, log a dev message and (optionally) preload data — for now just resolve immediately
- [ ] 4.6 Ensure the wrapper handles StrictMode double-mount in dev without leaking (guard with a boolean)

## 5. Sample MFE Vite Config

- [ ] 5.1 Update `apps/mfe-widget/vite.config.ts` to add `'./lifecycle': './src/index.tsx'` under `exposes`
- [ ] 5.2 Keep `'./App': './src/App.tsx'` exposed as a secondary export for tests
- [ ] 5.3 Keep `'./CounterWidget'` exposed for consumers that use the framework-agnostic class
- [ ] 5.4 Verify `pnpm build --filter @mf-mono/mfe-widget` produces `remoteEntry.js` including the new module

## 6. Sample MFE Tests

- [ ] 6.1 Add unit tests for the wrapper: bootstrap resolves, mount renders into supplied container, unmount clears the root, update re-renders
- [ ] 6.2 Add a test that mounts the wrapper into a fresh detached DOM element (not shared with other tests) — assert isolation
- [ ] 6.3 Add a test for double-mount protection (calling `mount` twice without `unmount` in between should fail gracefully or reuse the root, matching the wrapper's chosen strategy)
- [ ] 6.4 Verify existing `App.test.tsx` and `WidgetDashboard.test.tsx` continue to pass unchanged (App is still testable directly)

## 7. Shell Integration

- [ ] 7.1 Update the shell bootstrap (from `refactor-to-thin-shell`) to call `loader.load('mfe-widget', 'main-slot', props)` instead of any legacy React lazy import
- [ ] 7.2 Delete any remaining React Suspense wrappers around MFE loading in the shell
- [ ] 7.3 Manually verify in dev mode: navigating to `/widget/*` triggers the lifecycle, widget renders, navigating away triggers `unmount`
- [ ] 7.4 Manually verify chrome slots are untouched during feature MFE swaps (visible once `chrome-mfe-header` change lands, but structurally the loader must not touch other slots)

## 8. Documentation & Migration Guide

- [ ] 8.1 Update `packages/dynamic-loader/README.md` documenting `MFELifecycle`, `MFEProps`, and loader APIs (`load`, `unload`, `update`)
- [ ] 8.2 Add an "MFE Author Guide" section explaining how to migrate existing MFEs to the lifecycle contract
- [ ] 8.3 Add a code snippet showing the minimal React MFE wrapper (bootstrap/mount/unmount)
- [ ] 8.4 Document the fallback behavior when `update` is not exported

## 9. Verification

- [ ] 9.1 Run `pnpm build` at repo root and confirm zero type errors
- [ ] 9.2 Run `pnpm test` at repo root and confirm all new and existing tests pass
- [ ] 9.3 Run the widget in isolation (`pnpm --filter @mf-mono/mfe-widget dev`) and verify the local demo page invokes the lifecycle wrapper
- [ ] 9.4 Grep for remaining `React.lazy` imports referencing MFEs (should be zero in the shell after this change)
- [ ] 9.5 Confirm `packages/dynamic-loader/` coverage stays ≥85% after the new orchestration code lands
