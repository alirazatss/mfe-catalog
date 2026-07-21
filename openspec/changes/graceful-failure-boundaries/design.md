## Context

Current failure paths:

- Shell wraps the React tree in a single `ErrorBoundary` (`apps/website/src/components/ErrorBoundary.tsx`). A crash in any component takes down the whole page.
- Dynamic loader retries manifest fetch 3× with backoff then emits `config:fetch:error`. If that happens, the shell renders nothing meaningful.
- MFE code has no runtime error boundaries.
- Token refresh failures either succeed silently or throw uncaught.
- No structured error reporting.

After `refactor-to-thin-shell` and `mfe-lifecycle-contract` land:

- Shell is vanilla; no `ErrorBoundary` component exists in the shell
- Every MFE has a lifecycle; loader owns mount orchestration
- Auth is initialized in bootstrap

Now we need a real strategy. ADR-0006 defined five layers of failure handling. This change implements each layer with clear boundaries so that "one MFE crash doesn't take down the whole shell" is a testable requirement, not a hope.

**Stakeholders:**

- Shell team (owns bootstrap + slot fallbacks)
- MFE teams (wrap their app in an error boundary; report via the global)
- Observability team (subscribes to `window.__MFE_ERROR__` and forwards to monitoring)
- Auth team (owns refresh backoff and graceful logout)

**Constraints:**

- Fallback UI must be accessible (ARIA live regions for errors)
- No user data leaks in error UI (no stack traces in production; details in dev only)
- Retry logic must not create request storms (max concurrent retries, exponential backoff)
- Manifest cache must not serve stale content across major version boundaries (invalidate on schema version change)
- Zero external dependencies added except `react-error-boundary` (~1 KB, ~4M weekly downloads)

## Goals / Non-Goals

**Goals:**

- One MFE failure never breaks other MFEs
- Users always see a helpful message and retry action
- All errors funnel through `window.__MFE_ERROR__.report(error)` for centralized reporting
- Standard events (`mfe:load:failed`, `mfe:runtime:error`, `mfe:loaded`) match ADR-0006
- Auth refresh failures retry gracefully then log the user out with return URL preservation
- Manifest fetch cached in `localStorage` (24 h TTL) with fallback to cache on CDN outage
- Comprehensive tests for each failure mode
- Slot-level retry button that re-runs `loader.load(name, slotId)`

**Non-Goals:**

- Choosing an error-tracking vendor (Sentry, DataDog, etc.) — the bridge is vendor-agnostic; a follow-up change wires up a specific tool
- Automatic MFE version rollback on failure (v1 shows the error; rollback is a manual operator action for now)
- Version manifest strict enforcement (`@mf-mono/versions` may not exist yet; strict mode is opt-in and disabled by default)
- SSR error handling (out of scope)
- Handling malicious MFEs (assume all MFEs are trusted first-party or first-party audited)

## Decisions

### Decision 1: Four error layers, each with clear responsibility

Following ADR-0006:

1. **Bootstrap** (`apps/website/src/main.ts`) — critical errors that prevent any MFE mount → render critical-error template into `#app`
2. **Slot** (`packages/dynamic-loader/`) — MFE fails to load/mount → render fallback UI into that slot only; other slots keep working
3. **Runtime** (each MFE) — MFE crashes at render → `react-error-boundary` shows a scoped fallback; MFE reports the error
4. **Auth** (`apps/website/src/main.ts` + `packages/auth`) — token refresh fails → retry with backoff → clear session and redirect to `/login?returnUrl=<current>`

**Rationale:**

- Each layer has narrow responsibility → easy to reason, test, and change
- Failure localization matches the visual container (slot boundaries mirror error boundaries)
- No single point of failure

### Decision 2: `window.__MFE_ERROR__` global API

Single global that MFEs and shell subsystems use to report errors:

```typescript
window.__MFE_ERROR__ = {
  version: '1.0.0',
  report(error: MFEError): void,
  onError(cb: (e: MFEError) => void): () => void,
};

interface MFEError {
  mfe: string;             // e.g., 'mfe-widget'
  slot?: string;           // e.g., 'main-slot'
  type: 'load' | 'runtime' | 'auth' | 'network' | 'validation';
  error: Error;
  info?: unknown;          // React error info, etc.
  timestamp: number;
}
```

**Rationale:**

- Mirrors `window.__MFE_AUTH__` and `window.__MFE_NAVIGATION__` patterns → consistent DX
- Vendor-agnostic — observability team subscribes to forward wherever they want
- Structured payloads → easier dashboards

### Decision 3: Vanilla DOM fallback UI, not React

Loader renders slot fallbacks as vanilla DOM strings (with safe interpolation for MFE names). This works when React is not present in the shell.

```typescript
function renderSlotError(slot: HTMLElement, mfe: MFEConfig, error: Error) {
  slot.innerHTML = `
    <div class="mfe-error" role="alert" aria-live="polite">
      <div class="mfe-error-icon" aria-hidden="true">⚠️</div>
      <div class="mfe-error-message">${escapeHTML(mfe.type === "chrome" ? `${mfe.name} temporarily unavailable` : "Feature temporarily unavailable")}</div>
      <button type="button" data-mfe="${escapeAttribute(mfe.name)}" data-slot="${escapeAttribute(slot.id)}">Try again</button>
    </div>
  `;
  slot.querySelector("button")?.addEventListener("click", () => retryMFE(mfe.name, slot.id));
}
```

**Rationale:**

- Works without React (shell is vanilla)
- Escapes MFE names and slot ids to prevent XSS via manifest manipulation
- Attaches retry handler programmatically (no inline `onclick`)

### Decision 4: `react-error-boundary` for MFE runtime errors

Every MFE root component wraps its tree in `<ErrorBoundary FallbackComponent={ErrorFallback} onError={report}>`. The fallback is MFE-specific (branded, scoped). The `onError` callback funnels to `window.__MFE_ERROR__.report()`.

```tsx
<ErrorBoundary
  FallbackComponent={WidgetError}
  onError={(error, info) =>
    window.__MFE_ERROR__?.report({
      mfe: "mfe-widget",
      type: "runtime",
      error,
      info,
      timestamp: Date.now(),
    })
  }
  onReset={() => window.location.reload()}
>
  <App />
</ErrorBoundary>
```

**Rationale:**

- Widely used, tiny, no server dep
- Ergonomic hooks for reset
- Prevents "one uncaught error kills whole app" React quirk

### Decision 5: Auth refresh backoff with graceful logout

TokenManager gains a `refreshWithBackoff()` helper. Shell wires an `onRefreshFailed` handler:

```typescript
tokenManager.on("refresh:failed", async () => {
  const ok = await tokenManager.refreshWithBackoff({ maxAttempts: 3, baseMs: 500 });
  if (!ok) {
    await tokenManager.clearSession();
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }
});
```

**Rationale:**

- Robust to transient network hiccups
- Never leaves users in an infinite refresh loop
- Preserves user intent via `returnUrl`

### Decision 6: Manifest cache in `localStorage` (24 h TTL)

`fetchManifestWithRetry` first tries the network, then falls back to a `localStorage` cache if the network fails. Cache is invalidated:

- Automatically after 24 h
- On manifest schema version mismatch
- Manually via a dev tool button (nice-to-have)

**Rationale:**

- Enables the app to survive short CDN outages
- Aligns with existing manifest schema (which already includes version metadata from `refactor-to-thin-shell`)
- Short TTL keeps stale-data risk bounded

## Risks / Trade-offs

- **[Users see stale MFE versions during CDN outage]** → 24 h TTL bounded risk; document expected behavior; consider adding a subtle "using cached version" indicator
- **[XSS via manifest string interpolation]** → All manifest-derived strings escaped before insertion into `innerHTML`; use `textContent` where possible; audit slot renderers
- **[Excessive error reports]** → Debounce/throttle error reports per MFE per minute; observability layer can drop duplicates
- **[Auth backoff during outage causes noisy logouts]** → Cap attempts at 3 and total wait at ~7 s; longer outages fail cleanly rather than looping
- **[Retry button loop]** → After 3 rapid retries within 60 s, replace `Try again` with a "Contact support" message
- **[`react-error-boundary` version drift]** → Pin the version via the workspace catalog

## Migration Plan

**Phase 1 — Error Bridge:**

1. Add `apps/website/src/error-bridge.ts` with `setupErrorBridge()`
2. Wire into bootstrap BEFORE any other setup
3. Add tests

**Phase 2 — Slot Fallback UI:**

1. Add `packages/dynamic-loader/src/error-renderer.ts` with vanilla DOM fallback
2. Wire loader's error path to call the renderer
3. Add `retryLoad(name, slotId)` in the loader
4. Emit standard events (`mfe:load:failed`, `mfe:loaded`)

**Phase 3 — Runtime Boundaries in MFE:**

1. Add `react-error-boundary` to `apps/mfe-widget/package.json`
2. Wrap `App.tsx` root in `<ErrorBoundary>`
3. Report errors via `window.__MFE_ERROR__`
4. Add tests that throw synthetic errors and assert fallback UI

**Phase 4 — Auth Failure Handling:**

1. Add `refreshWithBackoff()` and `clearSession()` to `TokenManager` if not present
2. Wire the `refresh:failed` handler in bootstrap
3. Test: simulate refresh failure → verify redirect

**Phase 5 — Manifest Cache:**

1. Add `manifest-cache.ts` utility with `readFromCache()` / `writeToCache()`
2. Update `fetchManifestWithRetry` to use cache as fallback
3. Test: network fails but cache present → app loads

**Rollback:**

- Delete `error-bridge.ts` and slot fallback renderer; loader falls back to console error
- MFEs keep the error boundary (harmless when the global is absent)

## Open Questions

- Should critical errors block navigation entirely, or offer a "recovery mode" (e.g., load only chrome MFEs, disable feature MFEs)? (Recommendation: v1 blocks with critical-error page; recovery mode is a follow-up)
- Should retry attempts be tracked in the URL so refreshes retry from the same state? (Recommendation: no — keep state ephemeral)
- What happens if the error bridge itself is missing when an MFE tries to report? (Recommendation: MFEs feature-detect and gracefully no-op)
- Should the observability layer be inside the shell (a hook) or an MFE (a chrome MFE)? (Recommendation: hook in shell — analytics MFE consumes via `onError` subscription)
