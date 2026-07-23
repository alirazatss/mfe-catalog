## 1. Error Bridge

- [ ] 1.1 Create `apps/shells/website/src/error-bridge.ts` with `ErrorBridge` class implementing `MFEErrorAPI`
- [ ] 1.2 Expose `report(error)` that invokes all `onError` subscribers with the payload
- [ ] 1.3 Expose `onError(cb)` returning a cleanup function; use a `Set` for storage
- [ ] 1.4 Create `setupErrorBridge()` that populates `window.__MFE_ERROR__`; idempotent
- [ ] 1.5 Wire into `apps/shells/website/src/main.ts` — call BEFORE `setupAuthBridge()` and any other setup
- [ ] 1.6 Add unit tests: bridge shape, subscriber invocation, cleanup, idempotent setup

## 2. Slot Fallback Renderer

- [ ] 2.1 Create `packages/dynamic-loader/src/error-renderer.ts` with `renderSlotError(slot, mfe, error)` (vanilla DOM, escaped HTML)
- [ ] 2.2 Include XSS-safe escaping for MFE name, slot id, and (dev-only) error text
- [ ] 2.3 Add `data-mfe` and `data-slot` attributes on the retry button
- [ ] 2.4 Wire retry button `click` to a caller-provided `onRetry(name, slotId)` handler
- [ ] 2.5 Support different messaging for chrome vs feature MFEs
- [ ] 2.6 Add unit tests: correct DOM structure, escaping, retry callback wiring, chrome vs feature message

## 3. Loader Error Handling

- [ ] 3.1 Update `packages/dynamic-loader/src/DynamicLoader.ts` to wrap `load()` in try/catch and render fallback on failure
- [ ] 3.2 Add `retryLoad(name, slotId)` method that clears fallback and re-calls `load()`
- [ ] 3.3 Track per-MFE retry attempts within a 60 s rolling window
- [ ] 3.4 Emit `mfe:load:failed`, `mfe:loaded`, `mfe:load:exhausted` `CustomEvent`s
- [ ] 3.5 On third failure within 60 s, replace fallback with a persistent "Contact support" message
- [ ] 3.6 Update unit tests to cover: load failure fallback, retry success, retry exhaustion, event dispatch

## 4. MFE Runtime Error Boundaries

- [ ] 4.1 Add `react-error-boundary` (via workspace catalog) to `apps/mfes/mfe-widget/package.json`
- [ ] 4.2 Create `apps/mfes/mfe-widget/src/components/ErrorFallback.tsx` with a branded fallback UI
- [ ] 4.3 Wrap `apps/mfes/mfe-widget/src/App.tsx` root in `<ErrorBoundary FallbackComponent={ErrorFallback} onError={...}>`
- [ ] 4.4 In `onError`, call `window.__MFE_ERROR__?.report({ mfe: 'mfe-widget', type: 'runtime', error, info, timestamp: Date.now() })`
- [ ] 4.5 On reset, reload the current MFE (or use `resetKeys` from `react-error-boundary`)
- [ ] 4.6 Add unit tests: throw synthetic error, assert fallback rendered, assert reporter called

## 5. Auth Failure Handling

- [ ] 5.1 Add `TokenManager.refreshWithBackoff({ maxAttempts, baseMs })` if not already present
- [ ] 5.2 Add `TokenManager.clearSession()` to clear tokens and emit `mfe:auth:logout`
- [ ] 5.3 In shell bootstrap, subscribe to `tokenManager.on('refresh:failed', ...)` and invoke backoff
- [ ] 5.4 On backoff exhaustion, call `clearSession()` and `window.location.href = '/login?returnUrl=<encoded>'`
- [ ] 5.5 Ensure retry logic never runs concurrently with itself (guard flag)
- [ ] 5.6 Add tests: transient failure recovers, persistent failure logs out with returnUrl, no infinite loop

## 6. Manifest Cache

- [ ] 6.1 Create `apps/shells/website/src/manifest-cache.ts` with `readFromCache()` and `writeToCache(manifest)`
- [ ] 6.2 Store `{ manifest, timestamp, schemaVersion }` in `localStorage` under key `mfe-manifest-cache`
- [ ] 6.3 Invalidate cache older than 24 h or with mismatched `schemaVersion`
- [ ] 6.4 Update `fetchManifestWithRetry` in the shell to write cache on success, read on final failure
- [ ] 6.5 Emit `mfe:manifest:cache-fallback` event when cache is used
- [ ] 6.6 Add tests: write on success, read on failure, TTL enforcement, schema version invalidation

## 7. Critical Error Template

- [ ] 7.1 Create `apps/shells/website/src/critical-error.ts` with `renderCriticalError(message, error?)`
- [ ] 7.2 Embed static HTML template (headline, message, `Reload` button)
- [ ] 7.3 Ensure the template contains no dynamic scripts and uses `textContent` for message
- [ ] 7.4 In production, hide detailed error info; in dev, include a `<details>` block
- [ ] 7.5 Wire the reload button to `location.reload()`
- [ ] 7.6 Add tests: renders when called, includes error text in dev, hides error text in prod

## 8. CSS for Error Fallbacks

- [ ] 8.1 Add scoped CSS classes in `apps/shells/website/src/style.css`: `.mfe-error`, `.mfe-error-icon`, `.mfe-error-message`, `.mfe-error-button`, `.shell-critical-error`
- [ ] 8.2 Ensure `role="alert"` regions have accessible focus + aria-live behavior
- [ ] 8.3 Keep styles minimal — layout only; visual design lives in shells' own design tokens

## 9. Integration Tests

- [ ] 9.1 Integration test: simulate feature MFE fetch failure; assert only `main-slot` shows fallback; other slots functional
- [ ] 9.2 Integration test: simulate chrome MFE fetch failure; assert only that chrome slot shows fallback
- [ ] 9.3 Integration test: click `Try again`; second attempt succeeds; slot renders MFE
- [ ] 9.4 Integration test: three failed retries within 60 s; fallback switches to `Contact support` and stops offering retry
- [ ] 9.5 Integration test: MFE throws in render; error-boundary renders fallback; `window.__MFE_ERROR__.report` called; other MFEs unaffected
- [ ] 9.6 Integration test: manifest fetch fails, cache present → app boots from cache; `mfe:manifest:cache-fallback` fires
- [ ] 9.7 Integration test: manifest fetch fails, no cache → critical error rendered; no MFE mounts
- [ ] 9.8 Integration test: auth refresh fails 3× → user redirected to `/login?returnUrl=<current>` with cleared session

## 10. Documentation

- [ ] 10.1 Update `packages/dynamic-loader/README.md` with an `Error Handling` section
- [ ] 10.2 Document `window.__MFE_ERROR__` API contract and usage examples
- [ ] 10.3 Document the retry/exhaust behavior and how to override the retry window
- [ ] 10.4 Add "Error Handling" section to `CONTEXT.md` cross-referencing ADR-0006

## 11. Verification

- [ ] 11.1 `pnpm build` succeeds
- [ ] 11.2 `pnpm test` passes all tests with new coverage
- [ ] 11.3 Manual test in dev: kill the widget's dev server; refresh; observe fallback only in `main-slot`; other slots work
- [ ] 11.4 Manual test: throw an error in a component; observe MFE error boundary; verify report received in subscribers (Sentry stub or console)
- [ ] 11.5 Manual test: block `/manifest-*.json` via devtools; refresh; app boots from cache; observe `Using cached manifest` log
- [ ] 11.6 Manual test: reject auth refresh 3× via devtools; observe redirect to `/login?returnUrl=<current>` with session cleared
