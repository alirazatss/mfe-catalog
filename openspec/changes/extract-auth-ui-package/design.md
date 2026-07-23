## Context

Login and related auth UI are shared concerns across every current and future shell. All shells target the same Keycloak realm with identical corporate branding (ADR-0002, ADR-0003). Putting the login UI into an MFE is an anti-pattern because the shell needs a way to authenticate the user BEFORE the MFE loader is ready — this creates a chicken-and-egg problem with a CDN dependency for a critical path.

**Current state:**

- `apps/website/src/components/LoginPage.tsx` (124 lines) with mock login logic
- `apps/website/src/providers/AuthProvider.tsx` (224 lines) React Context wrapper
- `apps/website/src/components/ProtectedRoute.tsx` React Router guard
- `packages/auth/` already contains `TokenManager` (framework-agnostic, 100% test coverage)

**After `refactor-to-thin-shell` lands:**

- Those shell files are deleted
- Shell is a vanilla bootstrap
- Login route is temporarily broken until this change lands

**Target state:**

- `packages/auth-ui/` is a new npm package
- Shells import components from `@mfe-runtine/auth-ui`
- Shells still using a small React tree for their `/login` route get a plug-and-play component
- Shells using pure vanilla bootstrap call `setupAuthBridge()` and load a login MFE or minimal login route separately

**Stakeholders:**

- Platform team (owns package)
- Design team (owns corporate branding tokens)
- Shell teams (consume the package)

**Constraints:**

- Must not couple to a specific shell's environment (no absolute API URLs baked in)
- Must accept customization via props (logos, colors, custom fields)
- Must be tree-shakeable (shells that only need `LoginPage` should not pull in `ForgotPasswordPage`)
- Must be publishable to a private npm registry
- Peer-dep on React 19 (per catalog); no bundled React copy

## Goals / Non-Goals

**Goals:**

- Single source of truth for corporate-branded auth UI
- Zero shell-specific code inside the package (all configuration flows via props)
- Package builds with `tsdown` producing ESM + `.d.ts` (consistent with other `@mfe-runtine/*` packages)
- `setupAuthBridge()` exposes `window.__MFE_AUTH__` matching the ADR-0002 contract
- Package has ≥90% test coverage on components and helper
- Corporate branding centralized in `theme.ts` with prop overrides supported

**Non-Goals:**

- Building the backend `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` endpoints (backend is out of scope)
- Full OAuth/SSO redirect flow with third-party providers (v1 supports the corporate Keycloak email/password flow only; social providers stubbed via props)
- Multi-factor authentication UI (deferred to v2)
- Password reset backend integration (v1 renders the UI and calls a caller-provided async handler)
- Migrating existing MFEs to import from the package (MFEs never need auth UI; they consume tokens via `window.__MFE_AUTH__` from ADR-0002)

## Decisions

### Decision 1: Two-package split — logic in `@mfe-runtine/auth`, UI in `@mfe-runtine/auth-ui`

Keep `packages/auth/` framework-agnostic (TokenManager, JWT utils, types). Create `packages/auth-ui/` for React components. `auth-ui` depends on `auth`.

**Rationale:**

- `@mfe-runtine/auth` is already published-shaped and reused by MFE tests
- Framework-agnostic logic can be consumed from future non-React tools (CLI, backend adapters)
- React components are UI-only — cleaner boundary

**Alternatives considered:**

- Single package `@mfe-runtine/auth` with UI included (rejected — forces React peer dep on consumers that only need TokenManager)
- Three packages `auth`, `auth-react`, `auth-ui` (rejected — over-engineering for the current scope)

### Decision 2: Customization via props with sensible corporate defaults

`LoginPage` accepts props for logo, colors, additional form fields, callback handlers. Default theme comes from `theme.ts` (corporate palette). Consumers override only what they need.

```tsx
<LoginPage
  onLoginSuccess={(user) => window.__MFE_NAVIGATION__?.navigate("/")}
  logo="/customer-logo.svg" // override default
  primaryColor="#1e40af" // override default
  additionalFields={[{ name: "department", label: "Department" }]}
  socialProviders={["google", "sso"]}
/>
```

**Rationale:**

- Different shells may need slight variations (e.g., customer vs admin sign-in fields)
- Defaults enforce corporate branding; overrides are opt-in
- Aligns with common design-system patterns

**Alternatives considered:**

- Compile-time theming via CSS variables only (rejected — awkward for per-shell field arrays)
- Multiple `LoginPage` variants per shell (rejected — duplicates the problem we are solving)

### Decision 3: Provide both React Context (`AuthProvider`) and vanilla bridge (`setupAuthBridge`)

Some shells will keep a small React tree for their auth pages and want a `useAuth()` hook. Pure thin-shell setups need only the vanilla `window.__MFE_AUTH__` bridge. Ship both; consumers pick.

```ts
// Vanilla bootstrap use
import { setupAuthBridge } from '@mfe-runtine/auth-ui/bridge';
setupAuthBridge(); // populates window.__MFE_AUTH__

// React use
import { AuthProvider, useAuth } from '@mfe-runtine/auth-ui';
<AuthProvider>...</AuthProvider>
```

**Rationale:**

- Avoids forcing thin-shell adopters to use React for auth
- Keeps a familiar React API for shells that render a `/login` route in React
- Both APIs read from the same `tokenManager` singleton — no dual state

### Decision 4: Package built with `tsdown`, ESM only, `.d.ts` included

Match the build strategy of other `@mfe-runtine/*` packages (`packages/auth`, `packages/events`, `packages/dynamic-loader`).

**Rationale:**

- Consistent workspace tooling
- ESM only — all consumers are modern bundlers
- Tree-shakeable exports via named exports and subpath exports

### Decision 5: Peer dependencies pin React and React Router via catalog

`peerDependencies`: `react`, `react-dom`, `react-router` — all `^19`/`^8` matching the workspace catalog (ADR-0008).

**Rationale:**

- No bundled React copy
- Single React instance across all consumers
- Version alignment enforced via catalog

## Risks / Trade-offs

- **[Corporate branding drift]** → Design team owns `theme.ts`; require design review for prop overrides that alter primary color/logo
- **[Bundle size]** → Ship subpath exports (`@mfe-runtine/auth-ui/login`, `@mfe-runtine/auth-ui/bridge`) so shells only pay for what they import
- **[Test coverage of visual components]** → Use `@testing-library/react` for behavior tests; visual regression is deferred (Chromatic/Percy in future ADR)
- **[Version skew between shells]** → Enforce a minimum `@mfe-runtine/auth-ui` version in `@mfe-runtine/versions` (published as part of ADR-0008 version management)
- **[Shells that never render React]** → Provide `setupAuthBridge` and `theme.ts` tokens (CSS variables) so pure vanilla shells can still theme their static login route without React
- **[Publishing the package]** → Requires npm registry setup; before registry is ready, `workspace:*` linking works within the monorepo

## Migration Plan

**Phase 1 — Create the package (this change):**

1. Scaffold `packages/auth-ui/` with `package.json`, `tsdown.config.ts`, `vitest.config.ts`
2. Move `LoginPage`, `AuthProvider`, `ProtectedRoute` code out of `apps/website/src/` and into the package
3. Generalize `LoginPage` with props API and sensible defaults
4. Add `LogoutPage`, `SessionExpiredPage`, `ForgotPasswordPage` scaffolds
5. Add `setupAuthBridge` helper
6. Write tests targeting ≥90% coverage
7. Wire package into `apps/website/package.json` via `workspace:*` so the shell can consume it
8. Add the package to Turborepo pipeline (`build`, `test`, `test:coverage`)

**Phase 2 — Publish (deferred, tracked in `@mfe-runtine/versions` and repo-split changes):**

- Configure private npm registry credentials in CI
- Publish `@mfe-runtine/auth-ui@1.0.0`
- External shell repos start consuming from npm instead of workspace

**Phase 3 — Deprecate direct imports of removed shell files:**

- After `refactor-to-thin-shell` ships, no consumers reference the deleted `apps/website/src/**/Login*` paths
- Add CI check preventing new imports of the removed paths

**Rollback:**

- Revert the package creation commit
- Reintroduce the shell components on a feature branch if needed
- No data or runtime migrations to unwind

## Open Questions

- Should `LogoutPage` be a full page or a small confirmation modal? (Recommendation: small confirmation modal because logout is usually one click)
- Do we ship a default `logo.svg` in the package, or require every consumer to supply a logo? (Recommendation: ship a default corporate placeholder; consumers override)
- Should `setupAuthBridge` accept an `onAuthError` callback, or should error handling flow entirely through events? (Recommendation: expose both — direct callback for critical errors, events for normal flow)
- What happens on `LoginPage` when Keycloak returns a locked-account error? (Recommendation: render a specific "Account locked" message and provide a link to the reset flow)
