## Why

Cross-MFE navigation today goes through the `mfe:navigate` event bus. This works but has drawbacks: no synchronous access to current path from MFEs, no active-route detection API, no imperative back/forward, no query parameter helpers, no way to subscribe to navigation changes for analytics/highlighting. ADR-0005 established that the shell SHALL expose a `window.__MFE_NAVIGATION__` Global Navigation Bridge that MFEs can call imperatively AND subscribe to reactively, with React Router remaining inside each MFE for internal routing. This change implements the bridge, keeps the event bus as a fallback for older MFEs, and updates the shell + sample MFEs to prefer the bridge.

## What Changes

- Add `NavigationBridge` implementation in the shell bootstrap that exposes `window.__MFE_NAVIGATION__` with a defined API surface (`navigate`, `back`, `forward`, `go`, `getCurrentPath`, `getCurrentQuery`, `onNavigate`, `isActive`)
- Shell wires the bridge into its bootstrap: bridge coordinates `history.pushState`, notifies subscribers, and drives the MFE loader for feature route changes
- Update `packages/dynamic-loader/` types to export a `MFENavigationAPI` interface so MFEs and shells share the contract
- Update the existing `mfe:navigate` event bus listener to internally call the bridge — MFEs that emit the event still work; MFEs that call the bridge directly get the richer API
- Update `apps/mfe-widget/src/utils/navigation.ts` to feature-detect and prefer the bridge; keep event-bus emission as a fallback for zero-cost migration
- Update `apps/mfe-header` (once it exists per `chrome-mfe-header`) to use the bridge for nav clicks and active-route highlighting
- Emit `mfe:navigation:changed` events for observability (analytics MFEs can subscribe)

## Capabilities

### New Capabilities

- `navigation-bridge`: The `window.__MFE_NAVIGATION__` global API and its shell-side implementation, providing synchronous path access, imperative navigation, and reactive subscription for MFEs

### Modified Capabilities

- `cross-mfe-navigation`: Existing event-bus contract remains valid but is now backed by the navigation bridge; MFEs may migrate to the bridge for richer APIs

## Impact

**Affected code:**

- New: `apps/website/src/navigation-bridge.ts` — implementation of `NavigationBridge` class and `setupNavigationBridge(loader)` helper called from bootstrap
- `apps/website/src/main.ts` — bootstrap invokes `setupNavigationBridge(loader)` after auth setup and manifest load; existing `mfe:navigate` handling remains but delegates to the bridge
- `packages/dynamic-loader/src/index.ts` — export `MFENavigationAPI`, `NavigationEvent`, `NavigateOptions` types
- `apps/mfe-widget/src/utils/navigation.ts` — prefer bridge, fall back to event bus
- `apps/mfe-header/src/utils/navigate.ts` (once created in `chrome-mfe-header`) — prefer bridge, fall back to event bus
- Docs: update `packages/dynamic-loader/README.md` with bridge API reference

**Affected dependencies:**

- No new npm dependencies
- Continues to depend on `@mf-mono/events` for backward-compatible event bus emissions

**Affected tests:**

- New: `apps/website/src/navigation-bridge.test.ts` covering the full API (navigate, back, forward, popstate handling, subscriber notifications, active route matching)
- Updated: `apps/mfe-widget/src/utils/navigation.test.ts` — assert bridge is preferred when available and event-bus fallback works otherwise
- New: integration test verifying that emitting `mfe:navigate` still works AFTER the bridge is set up (bridge intercepts and normalizes)

**Migration risk:**

- Tight coupling: bridge implementation runs inside the shell — bugs affect all navigation, mitigate with strong test coverage before shipping
- Behavior parity: the event-bus path must continue to work identically for MFEs that have not migrated; add regression tests
- Analytics subscribers may register before bridge is initialized — bridge SHALL buffer up to N events during bootstrap and flush after `onNavigate` subscribers register, OR set up bridge before any MFE loads so events happen after subscribers
- `chrome-mfe-header` and `navigation-bridge` are complementary — recommend shipping bridge first, header second
