## 1. Package Scaffold

- [ ] 1.1 Create `packages/auth-ui/` with `package.json` (name `@mfe-runtine/auth-ui`, version `0.1.0`, private `false`), matching the layout of other `@mfe-runtine/*` packages
- [ ] 1.2 Add `tsdown.config.ts` producing ESM builds with `.d.ts`; configure subpath entry points for `.`, `./login`, `./logout`, `./forgot-password`, `./bridge`
- [ ] 1.3 Add `vitest.config.ts` with happy-dom environment and coverage thresholds (statements 90, branches 85, functions 90, lines 90)
- [ ] 1.4 Add `tsconfig.json` extending workspace base with React JSX config and strict mode
- [ ] 1.5 Declare peer deps on `react`, `react-dom`, `react-router` via catalog references
- [ ] 1.6 Declare workspace dep on `@mfe-runtine/auth: workspace:*`
- [ ] 1.7 Wire package into root `pnpm-workspace.yaml` (already covered by `packages/*` glob) and Turborepo `turbo.json` if any new tasks

## 2. Corporate Branding & Theme

- [ ] 2.1 Create `packages/auth-ui/src/theme.ts` exporting a `theme` object (colors, fonts, spacing, radii)
- [ ] 2.2 Ship a default corporate placeholder logo as an inline SVG data URL in `theme.logo`
- [ ] 2.3 Document the theme override API in `packages/auth-ui/README.md`
- [ ] 2.4 Expose CSS custom properties (`--auth-primary`, `--auth-background`, `--auth-error`, `--auth-radius`) applied by a root wrapper component

## 3. LoginPage Component

- [ ] 3.1 Create `packages/auth-ui/src/LoginPage.tsx`, generalizing the existing shell login form with a props API (`logo`, `primaryColor`, `additionalFields`, `socialProviders`, `onLoginSuccess`, `onLoginError`)
- [ ] 3.2 Replace the mock login (`localStorage.setItem`) with a call to `tokenManager.login({ email, password, ...additionalFields })`
- [ ] 3.3 Handle inline validation errors (empty email, invalid format, empty password) with accessible error messages
- [ ] 3.4 Handle HTTP 401 responses with an "Invalid credentials" inline error and refocus on the email field
- [ ] 3.5 Handle HTTP 423 or Keycloak `account_locked` responses with a locked-account message and a link to the forgot-password route
- [ ] 3.6 Parse `?returnUrl=` from the browser URL and pass it to `onLoginSuccess`
- [ ] 3.7 Ensure no token or credential is written to `localStorage` or `sessionStorage`
- [ ] 3.8 Add ARIA labels and keyboard-navigation tests
- [ ] 3.9 Add tests for happy path, invalid credentials, locked account, custom logo/color rendering, additional fields, return URL propagation

## 4. AuthProvider Context

- [ ] 4.1 Create `packages/auth-ui/src/AuthProvider.tsx` — React Context wrapper around `tokenManager`
- [ ] 4.2 On mount, call `tokenManager.initialize()` exactly once; guard against StrictMode double-invocation
- [ ] 4.3 Subscribe to `tokenManager` refresh/logout events and re-render consumers on state change
- [ ] 4.4 Export `useAuth()` hook returning `{ isAuthenticated, user, isLoading, login, logout, getAccessToken }`
- [ ] 4.5 Add tests covering: initial state, token change re-render, cleanup on unmount, idempotent initialization

## 5. ProtectedRoute Guard

- [ ] 5.1 Create `packages/auth-ui/src/ProtectedRoute.tsx` accepting `children`, `requiredRoles?`, `redirectTo?`
- [ ] 5.2 Redirect unauthenticated users to `redirectTo` (default `/login`) with `?returnUrl=<currentPath>`
- [ ] 5.3 Render an `Access denied` fallback when the user is authenticated but lacks a required role
- [ ] 5.4 Add tests for authenticated pass-through, unauthenticated redirect, role-guard denial, custom `redirectTo`

## 6. setupAuthBridge Helper

- [ ] 6.1 Create `packages/auth-ui/src/bridge/setupAuthBridge.ts` (exported from `@mfe-runtine/auth-ui/bridge`)
- [ ] 6.2 Populate `window.__MFE_AUTH__` with `{ version: '1.0.0', getToken, isAuthenticated, onTokenChange, logout }`
- [ ] 6.3 Wire `onTokenChange` to `tokenManager` events; return a cleanup function on subscription
- [ ] 6.4 Wire `logout` to `tokenManager.clearSession()` and dispatch a `mfe:auth:logout` `CustomEvent` on `window`
- [ ] 6.5 Make the helper idempotent (second call is a no-op; existing subscribers preserved)
- [ ] 6.6 Add tests covering: API shape, `onTokenChange` invocation, cleanup, logout event dispatch, idempotency

## 7. LogoutPage, SessionExpiredPage, ForgotPasswordPage

- [ ] 7.1 Create `packages/auth-ui/src/LogoutPage.tsx` — small confirmation modal component with `onConfirm`, `onCancel` props
- [ ] 7.2 Create `packages/auth-ui/src/SessionExpiredPage.tsx` — full-page notice with `Sign in again` CTA that navigates to `/login`
- [ ] 7.3 Create `packages/auth-ui/src/ForgotPasswordPage.tsx` — scaffold form that calls a caller-provided `onSubmit(email)` handler; render success/error states
- [ ] 7.4 Add tests for each component covering render, prop callbacks, error states

## 8. Public Exports & Subpath Configuration

- [ ] 8.1 Create `packages/auth-ui/src/index.ts` exporting `LoginPage`, `LogoutPage`, `SessionExpiredPage`, `ForgotPasswordPage`, `AuthProvider`, `useAuth`, `ProtectedRoute`, `theme`
- [ ] 8.2 Create `packages/auth-ui/src/login.ts`, `logout.ts`, `forgot-password.ts`, `bridge/index.ts` as subpath entry points
- [ ] 8.3 Configure `package.json` `exports` map with subpath entries and correct `types` for each
- [ ] 8.4 Verify tree-shaking via a smoke build that imports only `@mfe-runtine/auth-ui/bridge` and confirms React is not resolved

## 9. Integrate Into apps/website

- [ ] 9.1 Add `@mfe-runtine/auth-ui: workspace:*` to `apps/website/package.json`
- [ ] 9.2 Update the shell's bootstrap (from `refactor-to-thin-shell`) to call `setupAuthBridge()` from `@mfe-runtine/auth-ui/bridge`
- [ ] 9.3 Ensure the shell still passes E2E: unauthenticated navigation to a protected route redirects to `/login` (the login route now needs a way to render `<LoginPage />` — either a small React island in the shell or a login MFE, tracked separately)
- [ ] 9.4 Update `apps/website/src/test/*` to import mocks from the new package location if needed

## 10. Documentation

- [ ] 10.1 Write `packages/auth-ui/README.md` covering: install, quick start, props API, theming, subpath imports, examples
- [ ] 10.2 Add example snippet showing pure-vanilla-shell usage via `setupAuthBridge`
- [ ] 10.3 Add example snippet showing React-tree usage via `AuthProvider` + `ProtectedRoute`
- [ ] 10.4 Document breaking-change migration for shells previously importing from `apps/website/src/`

## 11. Verification

- [ ] 11.1 Run `pnpm build` at repo root and confirm the new package builds without type errors
- [ ] 11.2 Run `pnpm test` at repo root and confirm all new tests pass with ≥90% coverage on `packages/auth-ui/`
- [ ] 11.3 Manually verify in dev mode: shell renders `<LoginPage />` at `/login`, submitting valid mock credentials updates auth state, protected routes then load their MFEs
- [ ] 11.4 Manually verify: `window.__MFE_AUTH__` is populated by `setupAuthBridge()` and matches the ADR-0002 contract
- [ ] 11.5 Confirm no leftover references to deleted `apps/website/src/components/LoginPage.tsx`, `AuthProvider.tsx`, `ProtectedRoute.tsx`
