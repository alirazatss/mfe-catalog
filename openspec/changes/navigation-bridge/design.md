## Context

Cross-MFE navigation was originally implemented via a `mfe:navigate` custom event on the shared event bus (`@mfe-runtine/events`). The shell listens for that event and calls React Router's `useNavigate`. This worked for the fat-shell architecture but has several limitations for the Chrome MFE pattern:

1. **No synchronous path access** — chrome MFEs (like the header) cannot ask "what's the current path?" without subscribing and waiting
2. **No active-route detection** — highlighting the current nav item requires MFEs to reimplement URL matching
3. **No imperative history controls** — MFEs cannot programmatically go back or forward
4. **No query parameter helpers** — MFEs must parse the URL themselves
5. **Analytics subscribers must polyfill** — no first-class subscription API

ADR-0005 defined the target API. This change implements it while preserving the event-bus path as a fallback.

**Current state:**

- `apps/shells/website/src/components/NavigationEventListener.tsx` listens for `mfe:navigate` events and calls React Router's `useNavigate`
- After `refactor-to-thin-shell`, that React component is deleted and the shell handles navigation in vanilla JS
- `apps/mfes/mfe-widget/src/utils/navigation.ts` emits `mfe:navigate` events via `@mfe-runtine/events`

**Target state:**

- `window.__MFE_NAVIGATION__` is the primary API for cross-MFE navigation
- Event bus `mfe:navigate` is preserved as a fallback (bridge listens for it and routes through itself, keeping the observable behavior identical)
- MFEs feature-detect and prefer the bridge

**Stakeholders:**

- Shell teams (own the bridge implementation)
- Every MFE team (consumes the bridge)
- Analytics/observability team (subscribes to navigation events)

**Constraints:**

- Bridge must not depend on React Router
- Bridge lives inside the shell bootstrap (no npm package for the bridge itself; MFEs consume via `window.__MFE_NAVIGATION__`)
- Backward compatibility: MFEs that still emit `mfe:navigate` continue to work
- Bridge must set up BEFORE any MFE (chrome or feature) mounts, so subscribers registered inside `mount` callbacks always find the bridge ready

## Goals / Non-Goals

**Goals:**

- Ship `window.__MFE_NAVIGATION__` matching the ADR-0005 API
- Bridge coordinates `history.pushState`/`replaceState`/`popstate` with MFE loader
- Notify all subscribers on every navigation (push, replace, pop)
- Provide `isActive(path, { exact })` for chrome MFEs
- Backward-compatible with existing event-bus emissions
- Emit `mfe:navigation:changed` custom events for observability tools that prefer event-based APIs
- Comprehensive tests including popstate handling, subscriber cleanup, query params, active matching

**Non-Goals:**

- Framework-specific hooks (`useNavigation()` React hook) — MFEs use `window.__MFE_NAVIGATION__` directly; a helper package can be added later
- Route data prefetching APIs (deferred)
- Route transition animations (owned by MFEs)
- Server-side rendering considerations (out of scope)
- Full URL parsing edge cases (fragments, complex query encodings) — bridge handles the common cases; MFEs can extend

## Decisions

### Decision 1: Bridge is a class instance stored at `window.__MFE_NAVIGATION__`

```typescript
class NavigationBridge implements MFENavigationAPI {
  readonly version = '1.0.0';
  private listeners = new Set<(event: NavigationEvent) => void>();
  private loader: MFELoader;

  navigate(path, options) { /* pushState + notify + load MFE */ }
  onNavigate(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  isActive(path, opts) { /* prefix or exact match */ }
  // ... back, forward, go, getCurrentPath, getCurrentQuery
}

setupNavigationBridge(loader) {
  const bridge = new NavigationBridge(loader);
  window.__MFE_NAVIGATION__ = bridge;
  return bridge;
}
```

**Rationale:**

- Class encapsulates state (listeners set) and behavior
- Setup helper called from shell bootstrap, idempotent
- Type-safe via `MFENavigationAPI` interface exported from `packages/dynamic-loader`

### Decision 2: Bridge and event-bus coexist; bridge subsumes bus

The bridge internally subscribes to the `mfe:navigate` event bus. When an event arrives, the bridge calls its own `navigate(path)` method. MFEs that emit the event still trigger the same code path as MFEs that call `window.__MFE_NAVIGATION__.navigate` directly.

**Rationale:**

- Zero-break migration for existing MFEs (including `apps/mfes/mfe-widget`)
- Single code path for everything routing-related
- Analytics get a consistent event stream regardless of MFE origin

**Alternatives considered:**

- Emit event AND run bridge separately (rejected — two paths diverge over time)
- Deprecate event bus immediately (rejected — breaks the widget until it migrates)

### Decision 3: Bridge notifies before loader loads MFE

Order of operations in `navigate(path)`:

1. `history.pushState(state, '', url)`
2. Notify all `onNavigate` subscribers (synchronous)
3. `await loader.loadFeatureMFE(...)` for the new route

Analytics subscribers see the navigation intent immediately (helpful for tracking regardless of MFE load success). Loading errors surface separately via `graceful-failure-boundaries`.

**Rationale:**

- Fast feedback to chrome MFEs (highlights update immediately)
- Errors don't block observability

### Decision 4: `isActive` uses prefix match by default

```typescript
isActive("/widget"); // matches /widget, /widget/list, /widget/1/edit
isActive("/widget", { exact: true }); // matches only /widget
```

**Rationale:**

- Matches the intuition for navigation highlighting (child routes highlight the parent nav)
- Explicit `exact` option available when needed

### Decision 5: `popstate` handled centrally

Bridge registers `window.addEventListener('popstate', ...)`. On pop, it derives the new path and calls its own subscribers with `type: 'pop'`, then triggers loader for the matched feature MFE. This keeps back/forward behavior consistent with programmatic navigation.

**Rationale:**

- Single source of truth
- Popstate events fire on browser back/forward AND `history.back()` calls

### Decision 6: `MFENavigationAPI` interface exported from `packages/dynamic-loader`

Even though the bridge implementation lives in the shell, the TYPE definition lives in a shared package so both shells and MFEs can import it.

**Rationale:**

- MFEs need the type to satisfy TypeScript
- Shells need the type to implement the bridge
- Single source of truth prevents drift

## Risks / Trade-offs

- **[Bridge not ready when MFE mounts]** → Shell SHALL call `setupNavigationBridge()` before any MFE mount; the sample MFE feature-detects and falls back to event bus if the bridge is missing (defense in depth)
- **[Listener leaks]** → `onNavigate` returns a cleanup function; MFE tests SHALL assert cleanup is called on unmount
- **[Duplicate navigations]** → If an MFE emits the event AND calls the bridge, both fire — bridge deduplicates by comparing the target path to the current path before actioning
- **[Chrome MFEs re-render on every nav]** → Chrome MFEs subscribing to `onNavigate` should use `React.memo` / selective state updates to avoid excessive re-renders
- **[Race with popstate during MFE load]** → Loader operations are async; bridge tracks in-flight loads and cancels stale ones (last-write-wins)
- **[Analytics buffering]** → If subscribers register AFTER navigation events fire, they miss those events. Recommendation: shell registers analytics subscribers before mounting chrome MFEs so they catch initial navigation

## Migration Plan

**Phase 1 — Type and Contract:**

1. Add `MFENavigationAPI`, `NavigationEvent`, `NavigateOptions` types to `packages/dynamic-loader/src/navigation.ts`
2. Export from package `index.ts`

**Phase 2 — Bridge Implementation:**

1. Create `apps/shells/website/src/navigation-bridge.ts` with `NavigationBridge` class
2. Add `setupNavigationBridge(loader)` helper
3. Register `popstate` listener; subscribe to `mfe:navigate` event bus (backward compat)

**Phase 3 — Wire Into Bootstrap:**

1. Update `apps/shells/website/src/main.ts` to call `setupNavigationBridge(loader)` after auth setup and BEFORE any MFE mount
2. Remove any legacy React Router / `NavigationEventListener` handling (already removed by `refactor-to-thin-shell`)

**Phase 4 — Update Sample MFE:**

1. Update `apps/mfes/mfe-widget/src/utils/navigation.ts` to feature-detect the bridge and prefer it; keep event-bus fallback
2. Update tests to cover both paths

**Phase 5 — Documentation & Migration Guide:**

1. Document the bridge API in `packages/dynamic-loader/README.md`
2. Update MFE Author Guide with migration snippet from event bus to bridge

**Rollback:**

- Delete `navigation-bridge.ts` and the setup call from bootstrap
- MFEs feature-detect the bridge — absence is safe (they fall back to the event bus)

## Open Questions

- Should the bridge support scroll restoration on navigation? (Recommendation: yes — restore scroll on pop, reset scroll on push; adds ~15 lines of code)
- Should `navigate` return a promise that resolves when the target MFE mounts? (Recommendation: yes — enables sequential navigation flows; if MFE load fails, promise rejects)
- Should `onNavigate` receive the full URL or just the path? (Recommendation: pass an event object with `path`, `query`, `state`, `type` — matches ADR-0005 spec)
- Should analytics subscribers buffer events during bootstrap? (Recommendation: no — encourage subscribers to register early; the sample chrome header registers in `mount`, which runs after bridge setup)
