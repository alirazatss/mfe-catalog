## 1. Shell HTML Template & Layout

- [x] 1.1 Add slot elements (`header-slot`, `sidebar-slot`, `main-slot`, `footer-slot`) inside `#app` in `apps/shells/website/index.html` with `data-slot` attributes
- [x] 1.2 Add a minimal static fallback header inside `header-slot` (logo + `Reload` link) shown until chrome MFEs mount
- [x] 1.3 Add a static not-found placeholder template used by the shell when a route does not match any manifest feature
- [x] 1.4 Add a static critical-error template rendered when bootstrap fails; include a `Reload` button that calls `location.reload()`
- [x] 1.5 Rewrite `apps/shells/website/src/style.css` to contain only CSS grid layout targeting slot IDs; remove all color, typography, and component styling
- [x] 1.6 Verify visual grid layout in browser dev tools with all slots empty

## 2. Manifest Schema & Loader Updates

- [x] 2.1 Update `packages/remote-config/schema.json` to add `chrome` (object keyed by slot name) and `features` (object keyed by URL prefix) sections
- [x] 2.2 Update `features[<prefix>]` entries to include `mfe`, `entryUrl`, `basePath`, `requiresAuth` (default `true`), `requiredRoles` (default `[]`), `enabled`
- [x] 2.3 Update `packages/remote-config/src/types.ts` with corresponding TypeScript types
- [x] 2.4 Update JSON schema validator to enforce new structure with tests
- [x] 2.5 Update `apps/shells/website/public/remotes.config.json` to the new manifest format with `mfe-widget` under `features["/widget"]`
- [x] 2.6 Update `scripts/generate-config.ts` to emit the new format from discovered MFEs
- [x] 2.7 Update `packages/dynamic-loader/src/DynamicLoader.ts` to accept a slot ID target when loading a remote and to unmount the previous MFE from that slot

## 3. Vanilla Bootstrap Entry

- [x] 3.1 Rewrite `apps/shells/website/src/main.ts` as the vanilla bootstrap entry (no React import)
- [x] 3.2 Implement `fetchManifest()` with exponential backoff (1s, 2s, 4s) and 3 retry cap; return `null` on final failure
- [x] 3.3 Implement `renderCriticalError(message)` that swaps `#app` innerHTML with the static critical-error template
- [x] 3.4 Call `tokenManager.initialize()` and populate `window.__MFE_AUTH__` with `{ getToken, isAuthenticated, onTokenChange, logout, version }`
- [x] 3.5 Implement `mountChromeMFEs(manifest.chrome)` that mounts each chrome entry into its slot in parallel using the loader
- [x] 3.6 Implement `matchRoute(pathname, features)` using longest-prefix wins; return the matched feature entry or `null`
- [x] 3.7 Implement `mountFeatureForCurrentUrl()` that applies auth/role guards, then mounts the matched MFE into `main-slot` (or renders the not-found placeholder)
- [x] 3.8 Implement `registerNavigationHandlers()` that listens to `popstate` and to `mfe:navigate` events on the shared event bus, then calls `mountFeatureForCurrentUrl()`
- [x] 3.9 Wire all the above together in a single `bootstrap()` function; run it on module load

## 4. Route Guards in Bootstrap

- [x] 4.1 Implement `checkAuthGuard(feature)` that redirects to `/login?returnUrl=<encodedPath>` when `feature.requiresAuth === true` and user is unauthenticated
- [x] 4.2 Implement `checkRoleGuard(feature)` that renders an `Access denied` placeholder in `main-slot` when required roles are missing
- [x] 4.3 Default `requiresAuth` to `true` when the manifest entry omits the field (secure by default)
- [x] 4.4 Extract role claims from the JWT access token via `packages/auth` utilities (add a helper if none exists)

## 5. Remove Deprecated Shell Code

- [x] 5.1 Delete `apps/shells/website/src/providers/AuthProvider.tsx` and any imports of it
- [x] 5.2 Delete `apps/shells/website/src/components/LoginPage.tsx`
- [x] 5.3 Delete `apps/shells/website/src/components/Layout.tsx`
- [x] 5.4 Delete `apps/shells/website/src/components/ProtectedRoute.tsx`
- [x] 5.5 Delete `apps/shells/website/src/components/HomePage.tsx`
- [x] 5.6 Delete `apps/shells/website/src/components/NotFoundPage.tsx`
- [x] 5.7 Delete `apps/shells/website/src/components/NavigationEventListener.tsx`
- [x] 5.8 Delete `apps/shells/website/src/App.tsx` (or reduce to a re-export stub if referenced anywhere)
- [x] 5.9 Delete `apps/shells/website/src/main.tsx` if replaced by `main.ts`
- [x] 5.10 Delete corresponding test files (`Layout.test.tsx`, `ProtectedRoute.test.tsx`) that cover removed components
- [x] 5.11 Remove `react-router` and any React DOM rendering dependencies from `apps/shells/website/package.json` (keep `react`/`react-dom` only if still needed by other tooling; otherwise remove)
- [x] 5.12 Remove unused imports and dead files under `apps/shells/website/src/`

## 6. Tests for New Shell Behavior

- [x] 6.1 Add unit test for `matchRoute()` covering exact match, longest-prefix wins, no match
- [x] 6.2 Add unit test for `fetchManifest()` retry behavior (success on retry, exhaustion, cache fallback if implemented)
- [x] 6.3 Add integration test for full bootstrap happy path: manifest loads, auth initializes, chrome + feature MFEs mount into correct slots
- [x] 6.4 Add integration test for auth-guard redirect: unauthenticated user visiting protected route ends up at `/login?returnUrl=...`
- [x] 6.5 Add integration test for role-guard placeholder: authenticated user without required role sees `Access denied` in `main-slot`
- [x] 6.6 Add integration test for critical-error path: manifest fetch fails 3 times, `#app` shows critical-error template
- [x] 6.7 Add integration test that verifies chrome slots stay mounted across a `popstate` route change while `main-slot` swaps
- [x] 6.8 Add a build-time check (script or vitest) that fails if runtime shell code under `apps/shells/website/src/**/*.{ts,js}` exceeds 250 non-blank, non-comment lines (excluding `*.d.ts` and `*.test.*`)

## 7. Shell Size & Build Enforcement

- [x] 7.1 Add a small script `scripts/check-shell-size.ts` that counts eligible lines and exits non-zero above 250
- [x] 7.2 Wire `check-shell-size` into `apps/shells/website/package.json` prebuild step
- [x] 7.3 Wire `check-shell-size` into CI (`turbo build` chain) so PRs fail on size regression
- [x] 7.4 Confirm the current thin-shell implementation passes the check with headroom

## 8. Verification & Cleanup

- [x] 8.1 Run `pnpm build` at repo root and confirm zero type errors
- [x] 8.2 Run `pnpm test` at repo root and confirm all remaining tests pass (previous 117 minus removed component tests + new bootstrap tests)
- [x] 8.3 Manually verify in dev mode: existing `mfe-widget` loads via `/widget/*`, chrome slot fallback header stays until chrome MFEs are added in a later change
- [x] 8.4 Manually verify: navigating to `/anything-else` shows the not-found placeholder without breaking chrome slots
- [x] 8.5 Manually verify: unauthenticated visit to `/widget` redirects to `/login?returnUrl=/widget` (even though login MFE is not yet built — expect the shell to attempt to mount the login route feature)
- [x] 8.6 Update `CONTEXT.md` "Implementation Phases" section to mark Phase 1 (thin-shell prep) as delivered
- [x] 8.7 Confirm no lingering references to deleted components remain (`grep -R "AuthProvider\|LoginPage\|ProtectedRoute\|NavigationEventListener" apps/shells/website/src`)
