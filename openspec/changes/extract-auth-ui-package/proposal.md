## Why

The current `LoginPage`, `AuthProvider` React logic, and related auth UI live inside `apps/website/src/`. With multiple shells planned (customer-shell, admin-shell, marketing-shell) sharing one Keycloak instance and one corporate branding (ADR-0002, ADR-0003), duplicating ~350 lines of auth UI across every shell repository is a maintenance liability. Since login is required BEFORE the MFE loader is ready (bootstrap dependency), the login UI cannot be an MFE — it must be an npm package bundled into every shell.

## What Changes

- Create new npm package `@mf-mono/auth-ui` under `packages/auth-ui/` that exports React components for login, logout, session-expired, and forgot-password flows
- Extract `LoginPage.tsx` from `apps/website/src/components/` into the new package with a customization API (logo, primaryColor, additional fields, social providers)
- Extract `AuthProvider.tsx` React Context wrapper from `apps/website/src/providers/` into the package (kept for shells that want a React-context-based auth API)
- Extract `ProtectedRoute.tsx` from the shell into the package so shells that still render some React can reuse the guard
- Expose a single `setupAuthBridge()` helper that shells call from their vanilla bootstrap to populate `window.__MFE_AUTH__`
- Keep `packages/auth/` focused on framework-agnostic logic (`TokenManager`, JWT utilities, types); `@mf-mono/auth-ui` depends on it
- Publish `@mf-mono/auth-ui` to the private npm registry so shell repos in separate repositories can consume it
- **BREAKING**: `apps/website` now imports auth UI from `@mf-mono/auth-ui` instead of local files (paired with `refactor-to-thin-shell` change)

## Capabilities

### New Capabilities

- `auth-ui-package`: A shared React UI package for corporate-branded authentication flows (LoginPage, LogoutPage, SessionExpiredPage, ForgotPasswordPage) with a customization API and standalone `setupAuthBridge()` helper for shells

### Modified Capabilities

- (none — this change ADDS a new capability; the shell's usage of local auth components was removed in `refactor-to-thin-shell`; when shells need auth UI again, they will consume it from this new package)

## Impact

**Affected code:**

- New package `packages/auth-ui/` with source, tests, and build config (`tsdown` for library builds, like other `@mf-mono/*` packages)
- `packages/auth-ui/src/LoginPage.tsx` — extracted, generalized with props API
- `packages/auth-ui/src/LogoutPage.tsx` — new confirmation UI
- `packages/auth-ui/src/SessionExpiredPage.tsx` — new UI shown when refresh fails after retries
- `packages/auth-ui/src/ForgotPasswordPage.tsx` — placeholder flow scaffolded
- `packages/auth-ui/src/AuthProvider.tsx` — React Context wrapper around `tokenManager`
- `packages/auth-ui/src/ProtectedRoute.tsx` — React Router–compatible guard component
- `packages/auth-ui/src/setupAuthBridge.ts` — helper that exposes `window.__MFE_AUTH__` from `tokenManager`
- `packages/auth-ui/src/theme.ts` — corporate branding tokens (colors, fonts, logo URL default)
- `packages/auth-ui/src/index.ts` — public exports
- `packages/auth-ui/package.json` — declares peer deps on `react`, `react-dom`, `react-router` (all `^19`/`^8`) and dep on `@mf-mono/auth: workspace:*`

**Affected dependencies:**

- `apps/website/package.json` — adds `@mf-mono/auth-ui: workspace:*`
- Shell repositories (future) — will add `@mf-mono/auth-ui: ^1.0.0` from npm

**Affected tests:**

- Move test files for `LoginPage`, `AuthProvider`, `ProtectedRoute` into `packages/auth-ui/src/**/*.test.tsx`
- Add new tests for `setupAuthBridge` covering `window.__MFE_AUTH__` shape and event wiring
- Add tests for `LogoutPage` and `SessionExpiredPage`

**Migration risk:**

- Package must be built and published (or `workspace:*` linked) before the shell can import from it
- Corporate branding tokens need alignment with the design team; ship v1 with sensible defaults and support overrides via props
- `AuthProvider` React Context path is intentionally optional (shells that follow the pure thin-shell pattern from `refactor-to-thin-shell` will not use it)
