## 1. Types & Contract

- [ ] 1.1 Create `packages/dynamic-loader/src/navigation.ts` exporting `MFENavigationAPI`, `NavigationEvent`, `NavigateOptions` TypeScript interfaces matching the ADR-0005 contract
- [ ] 1.2 Export these types from `packages/dynamic-loader/src/index.ts`
- [ ] 1.3 Add unit test that imports the types and asserts the shape

## 2. NavigationBridge Implementation

- [ ] 2.1 Create `apps/website/src/navigation-bridge.ts` with `NavigationBridge` class implementing `MFENavigationAPI`
- [ ] 2.2 Implement `navigate(path, options?)`: dedupe same-path calls, build URL from path + query, push or replace state, notify subscribers, drive loader
- [ ] 2.3 Implement `back`, `forward`, `go(delta)` delegating to `window.history`
- [ ] 2.4 Implement `getCurrentPath`, `getCurrentQuery` reading from `window.location`
- [ ] 2.5 Implement `onNavigate(cb)` returning a cleanup function; use a `Set` for listeners
- [ ] 2.6 Implement `isActive(path, options?)` with prefix (default) and exact match
- [ ] 2.7 Register a `popstate` listener that notifies subscribers with `type: 'pop'` and drives the loader
- [ ] 2.8 Register an `mfe:navigate` event-bus subscription that calls `bridge.navigate(event.path)`
- [ ] 2.9 Dispatch `mfe:navigation:changed` `CustomEvent` on window for every navigation
- [ ] 2.10 Add a `dispose()` method (for tests) that removes all listeners

## 3. Setup Helper

- [ ] 3.1 Create `setupNavigationBridge(loader)` in `apps/website/src/navigation-bridge.ts`
- [ ] 3.2 Make it idempotent: if `window.__MFE_NAVIGATION__` already exists, return the existing instance
- [ ] 3.3 Wire the bridge into `apps/website/src/main.ts` bootstrap AFTER auth setup and BEFORE any `loader.load(...)` call
- [ ] 3.4 Ensure test hooks are exposed to reset the bridge between tests

## 4. Sample MFE Updates

- [ ] 4.1 Update `apps/mfe-widget/src/utils/navigation.ts` to feature-detect `window.__MFE_NAVIGATION__`
- [ ] 4.2 If bridge available: call `window.__MFE_NAVIGATION__.navigate(path, options)`
- [ ] 4.3 If bridge missing: fall back to `emitMFEEvent(MFE_EVENTS.NAVIGATE, { path, ... })`
- [ ] 4.4 Preserve existing return type / signature so callers do not need to change
- [ ] 4.5 Update `apps/mfe-widget/src/utils/navigation.test.ts` to cover both branches
- [ ] 4.6 If `chrome-mfe-header` change has landed, update its `navigate` helper the same way

## 5. Tests

- [ ] 5.1 Unit test: `navigate(path)` pushes history and notifies subscribers
- [ ] 5.2 Unit test: `navigate(path, { replace: true })` replaces history
- [ ] 5.3 Unit test: `navigate(path, { query })` produces correct URL
- [ ] 5.4 Unit test: same-path `navigate` is a no-op
- [ ] 5.5 Unit test: `back` / `forward` / `go(delta)` delegate to `window.history`
- [ ] 5.6 Unit test: `popstate` handler notifies with `type: 'pop'`
- [ ] 5.7 Unit test: `onNavigate` cleanup unsubscribes
- [ ] 5.8 Unit test: multiple subscribers all notified in registration order
- [ ] 5.9 Unit test: `isActive` prefix vs exact
- [ ] 5.10 Unit test: `mfe:navigation:changed` window event fires on every nav
- [ ] 5.11 Unit test: event-bus fallback — dispatching `mfe:navigate` calls the same bridge code path
- [ ] 5.12 Unit test: `setupNavigationBridge` is idempotent
- [ ] 5.13 Integration test: shell bootstrap sets up bridge, feature MFE emits `mfe:navigate`, bridge handles it identically to `bridge.navigate` direct call
- [ ] 5.14 Coverage on new files ≥90% statements, ≥85% branches

## 6. Documentation

- [ ] 6.1 Update `packages/dynamic-loader/README.md` with a `Navigation Bridge` section referencing ADR-0005
- [ ] 6.2 Document the API: examples for `navigate`, `onNavigate`, `isActive`, migration from event bus
- [ ] 6.3 Update `CONTEXT.md` to reflect that cross-MFE navigation uses the bridge (with event bus as fallback)
- [ ] 6.4 Update `docs/adr/0005-cross-mfe-navigation.md` status if implementation details drift from the ADR

## 7. Verification

- [ ] 7.1 `pnpm build` at repo root succeeds with zero type errors
- [ ] 7.2 `pnpm test` at repo root passes all tests including new bridge tests
- [ ] 7.3 Manual verification in dev mode: navigate via bridge, back button works, subscribers highlight active nav item
- [ ] 7.4 Manual verification: emit `mfe:navigate` from browser devtools; observe identical behavior to bridge call
- [ ] 7.5 Grep for direct `history.pushState` calls outside the bridge (should be zero after this change)
