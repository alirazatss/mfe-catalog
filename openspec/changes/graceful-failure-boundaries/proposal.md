## Why

The shell today catches errors via a single React `ErrorBoundary` and the dynamic loader has retry logic for the manifest fetch. Neither handles the failure modes that ADR-0006 identified: MFEs failing to load from CDN, MFEs crashing at runtime, auth refresh failing after retries, version mismatches, or CDN blips. In production a broken chrome MFE currently kills the entire page. This change introduces slot-level fallback UIs, retry buttons, cache-fallback for the manifest, and structured error reporting so a single MFE failure never brings down the whole application.

## What Changes

- Introduce four layers of failure handling as defined in ADR-0006:
  - **Bootstrap layer**: shell renders a critical-error page ONLY when the app cannot start (auth init corrupted + manifest missing + no cache)
  - **Slot layer**: each slot renders a scoped fallback (`⚠️ Feature unavailable [Try again]`) when its MFE fails to load or mount; other slots stay functional
  - **Runtime layer**: MFEs wrap their entry component in a `<ErrorBoundary>` (`react-error-boundary`) that catches render errors and reports them via `window.__MFE_ERROR__`
  - **Auth layer**: token refresh failures retry with exponential backoff, then log the user out gracefully with a return URL
- Add `window.__MFE_ERROR__` global (`report(error)`, `onError(cb)`) so all layers funnel structured errors to a single place
- Emit lifecycle events (`mfe:load:failed`, `mfe:runtime:error`, `mfe:loaded`) matching the existing lifecycle events from `mfe-lifecycle-contract`
- Add manifest caching in `localStorage` (24 h TTL) as a fallback when the CDN is unreachable
- Add slot-level `retryMFE(name, slotId)` helper wired to the fallback UI's `Try again` button
- Add `SessionExpiredPage` handoff when auth cannot recover (uses component from `@mfe-runtine/auth-ui`)
- Add opt-in strict version validation on MFE load (via `@mfe-runtine/versions` when available from ADR-0008; disabled by default in v1)

## Capabilities

### New Capabilities

- `graceful-failure-boundaries`: The end-to-end error-handling strategy across shell bootstrap, MFE loader, per-slot UI, per-MFE React tree, and auth flow; includes `window.__MFE_ERROR__` global and standardized error events

### Modified Capabilities

- `dynamic-loader`: Loader gains a `retryLoad(name, slotId)` helper and standardizes error events (`mfe:load:failed`, `mfe:runtime:error`, `mfe:loaded`) it already partly emits from the lifecycle contract
- `module-federation-host`: Host bootstrap defines critical-error rendering; each slot exposes fallback UI hooks that the loader populates on failure

## Impact

**Affected code:**

- New: `apps/shells/website/src/error-bridge.ts` — implementation of `ErrorBridge` class and `setupErrorBridge()` populating `window.__MFE_ERROR__`
- `apps/shells/website/src/main.ts` — bootstrap calls `setupErrorBridge()` before setting up other bridges
- `apps/shells/website/src/critical-error.ts` — renders critical-error template into `#app` on unrecoverable failures
- `apps/shells/website/index.html` — includes CSS for critical-error and slot-error placeholders
- `packages/dynamic-loader/src/DynamicLoader.ts` — adds `retryLoad(name, slotId)` method; wraps `loader.load` steps with error boundary that emits standard events and renders slot fallback via a caller-provided renderer
- `packages/dynamic-loader/src/error-renderer.ts` — default slot fallback renderer (vanilla DOM) that the shell wires up
- `apps/mfes/mfe-widget/src/App.tsx` (and any future MFE) — wrap the root in `react-error-boundary` and report via `window.__MFE_ERROR__.report()`
- `packages/auth/src/TokenManager.ts` — expose `refreshWithBackoff()` and `clearSession()` if not already exposed; emit `refresh:failed` events
- `apps/shells/website/src/main.ts` — subscribe to `refresh:failed`; call `tokenManager.refreshWithBackoff()`; on final failure `tokenManager.clearSession()` and redirect to `/login?returnUrl=<current>`
- `apps/shells/website/public/manifest-cache.ts` (client cache utility) — reads/writes the manifest to `localStorage` with a 24 h TTL

**Affected dependencies:**

- `apps/mfes/mfe-widget/package.json` — add `react-error-boundary` (small, common package)
- Future MFEs — same

**Affected tests:**

- New: `apps/shells/website/src/error-bridge.test.ts` covering API shape, event dispatch, subscribers
- New: `packages/dynamic-loader/src/error-renderer.test.ts` covering fallback rendering, retry button wiring
- New: `apps/shells/website/src/critical-error.test.ts` covering the render helper
- Updated: `packages/dynamic-loader/src/DynamicLoader.test.ts` — cover retry, fallback rendering, error event emission
- New: MFE error-boundary tests in `apps/mfes/mfe-widget/src/App.test.tsx` (throw a synthetic error, assert fallback appears, assert `window.__MFE_ERROR__.report` was called)
- New: integration test that simulates a failed remote fetch and asserts other slots remain functional

**Migration risk:**

- Introducing new global (`window.__MFE_ERROR__`) — namespace collision unlikely but validated
- MFEs must add `react-error-boundary` — provide a codemod snippet in the migration guide
- Manifest caching in `localStorage` can go stale — cap TTL at 24 h and clear on version bump; document to consumers
- Auth-refresh backoff and clear-session logic must not accidentally logout users on transient network blips — mitigate via minimum retry count (3) and backoff caps
