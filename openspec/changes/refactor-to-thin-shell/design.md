## Context

The current shell (`apps/website`) evolved from a demo/prototype into a production-oriented setup. It carries React components (Layout, LoginPage, ProtectedRoute, AuthProvider) that provide value today but block the Chrome MFE pattern established in ADR-0004. As we plan to add `admin-shell`, `marketing-shell`, and potentially more shells owned by different teams, keeping business logic in each shell will multiply maintenance cost and prevent independent chrome deployment.

**Current state (verified 2026-07-14):**

- Shell: 476+ lines of business logic in `apps/website/src/`
- `AuthProvider.tsx`: 224 lines managing auth state via React Context
- `LoginPage.tsx`: 124 lines with corporate-branded form
- `Layout.tsx`: 128 lines rendering header, nav, footer, logout
- `App.tsx`: React Router routes + `window.__AUTH__` exposure
- `main.tsx`: Bootstrap sequence — initializes remotes, wraps app in `BrowserRouter` + `AuthProvider`
- MFE `apps/mfe-widget`: Already Module-Federation-based, mounts via `App` export

**Target state:**

- Shell HTML: empty template with four DOM slots
- Shell JS: bootstrap (~100 lines) + navigation bridge + slot manager
- Shell CSS: layout-only (grid areas)
- No React components in shell (except optional error page)
- Auth logic preserved via `window.__MFE_AUTH__` global

**Stakeholders:**

- Platform team (owns shared packages, shell templates)
- Customer/Admin teams (will own future shells)
- MFE teams (must continue working during migration)

**Constraints:**

- Single Keycloak instance (SSO via wildcard cookies — ADR-0002)
- React 19 + Vite + Module Federation stack (ADR-0008)
- Cannot break existing MFE (`apps/mfe-widget`) during migration
- Must preserve 117 passing tests where behavior is retained
- Login flow will be temporarily broken until `extract-auth-ui-package` lands (accepted risk)

## Goals / Non-Goals

**Goals:**

- Shell code stays under 250 lines of TypeScript/JS (excluding types and CSS)
- Zero React components rendered directly by shell
- All UI chrome rendered by MFEs into named slots
- Auth state initialized once during shell bootstrap, exposed via `window.__MFE_AUTH__`
- Existing `mfe-widget` continues loading via Module Federation without changes
- Route matching in shell is vanilla URL prefix matching (no React Router)
- Bootstrap fails gracefully with a critical error page if manifest or auth unreachable

**Non-Goals:**

- Creating the header/sidebar/footer chrome MFEs (deferred to `chrome-mfe-header` change)
- Extracting `LoginPage` into `@mf-mono/auth-ui` (deferred to `extract-auth-ui-package` change)
- Migrating MFEs to lifecycle contract (deferred to `mfe-lifecycle-contract` change)
- Introducing the navigation bridge API (deferred to `navigation-bridge` change)
- Multi-shell repository split (deferred to a later infrastructure change)
- Backend/Keycloak configuration changes (backend is out of scope)

## Decisions

### Decision 1: Vanilla JS bootstrap, not React

The shell entry (`main.ts`) is a plain TypeScript module that manipulates the DOM directly, fetches the manifest, and drives the MFE loader. It does not import React at all.

**Rationale:**

- Shell must remain framework-agnostic in spirit even though MFEs will be React (ADR-0007)
- No React dependency means faster shell startup (~50-100KB smaller)
- Bootstrap is naturally imperative (fetch → init → load); reactive frameworks add ceremony
- Aligns with industry standard (Spotify, DAZN, Zalando use vanilla shell entries)

**Alternatives considered:**

- Keep minimal React shell (rejected — pulls in React runtime for no rendering benefit)
- Web Components shell (rejected — over-engineering for slot management)

### Decision 2: Named DOM slots in `index.html`

Add four fixed slot elements at build time:

```html
<div id="app">
  <div id="header-slot" data-slot="header"></div>
  <aside id="sidebar-slot" data-slot="sidebar"></aside>
  <main id="main-slot" data-slot="main"></main>
  <footer id="footer-slot" data-slot="footer"></footer>
</div>
```

**Rationale:**

- Simple, predictable — MFEs know exactly where to mount
- CSS grid can target slot IDs directly for layout
- No shadow DOM complexity for MVP
- Slots can be reused across shells with different content

**Alternatives considered:**

- Dynamic slot creation from manifest (rejected — adds runtime complexity, harder to CSS-target)
- Web Components with `<slot>` (rejected — requires shadow DOM strategy first)

### Decision 3: Preserve `TokenManager` (`@mf-mono/auth`), delete `AuthProvider` React wrapper

`packages/auth/TokenManager.ts` is framework-agnostic and stays. `apps/website/src/providers/AuthProvider.tsx` (React Context wrapper) is deleted. The shell bootstrap calls `tokenManager.initialize()` directly and exposes state on `window.__MFE_AUTH__`.

**Rationale:**

- `TokenManager` already has 22 tests (100% coverage) — reuse verified code
- React Context is only useful if shell renders React (it won't)
- MFEs get auth via global bridge, not React Context (ADR-0002)

### Decision 4: Route matching via manifest, not React Router

Shell reads `features` map from manifest, matches `window.location.pathname` against route prefixes, loads matching MFE into `main-slot`.

```typescript
// Manifest features section
{
  "features": {
    "/widget": { "mfe": "widget", "entryUrl": "..." },
    "/dashboard": { "mfe": "dashboard", "entryUrl": "..." }
  }
}

// Shell matcher (simplified)
function matchRoute(pathname: string): FeatureMFE | null {
  const prefix = Object.keys(manifest.features)
    .sort((a, b) => b.length - a.length) // longest prefix wins
    .find(p => pathname === p || pathname.startsWith(`${p}/`));
  return prefix ? manifest.features[prefix] : null;
}
```

**Rationale:**

- Shell needs zero routing knowledge beyond MFE selection
- React Router stays in MFEs (each uses `basename` matching route prefix — ADR-0005)
- Manifest becomes single source of truth for which MFE owns which route

### Decision 5: Auth check in bootstrap, not React guard component

Instead of `<ProtectedRoute>` wrapping React routes, the bootstrap sequence:

1. Try `tokenManager.initialize()` (refreshes token if cookie exists)
2. If success → set `window.__MFE_AUTH__`, load MFEs
3. If failure AND current route is protected → redirect to `/login`
4. If failure AND route is public → load MFEs anyway (login MFE handles auth UI later)

Route protection metadata comes from the manifest:

```json
{
  "features": {
    "/widget": { "mfe": "widget", "requiresAuth": true },
    "/login": { "mfe": "login", "requiresAuth": false }
  }
}
```

**Rationale:**

- No React tree = no guard components
- Auth decision happens once, before any MFE loads
- Manifest is declarative source of truth for protection rules

### Decision 6: Graceful shell-level failures

Bootstrap wraps critical steps in try/catch. Any hard failure (manifest fetch after retries, DOM missing) renders a static error page directly into `#app`:

```html
<div class="shell-critical-error">
  <h1>Something went wrong</h1>
  <p>Please reload the page. If the problem persists, contact support.</p>
  <button onclick="location.reload()">Reload</button>
</div>
```

**Rationale:**

- Aligns with ADR-0006 (Graceful Failure Handling)
- Full graceful failure per slot is deferred to `graceful-failure-boundaries` change; this covers Layer 1 (bootstrap failures) only

## Risks / Trade-offs

- **[Login broken between changes]** → Land `refactor-to-thin-shell` and `extract-auth-ui-package` in same release cycle; keep old code on a feature branch until both are green
- **[User loses layout during migration]** → Include a minimal built-in fallback header inside `index.html` (just a logo + reload link) shown until chrome MFEs mount; document as temporary
- **[Existing shell tests break]** → Delete tests for removed components (LoginPage, Layout, ProtectedRoute); write new tests for bootstrap + slot management; net test count drops but coverage of remaining shell code stays high
- **[React Router usage still needed inside MFEs]** → Keep `react-router` in MFE dependencies; only remove from shell `package.json`; document that shells never import React Router
- **[Bootstrap complexity grows over time]** → Enforce 250-line ceiling via CI check on `apps/website/src/*.ts` line count; anything larger triggers ADR re-review
- **[Vanilla DOM manipulation risks XSS]** → All manifest-driven strings must be validated; use `textContent`/`setAttribute` only, never `innerHTML` for user-derived content; template strings for error UI are static/hard-coded

## Migration Plan

**Phase 1 — Prepare (this change):**

1. Add slot elements to `index.html`
2. Rewrite `main.ts` as vanilla bootstrap
3. Update `App.tsx` — remove React tree, keep `window.__MFE_AUTH__` setup or delete entirely once bootstrap owns it
4. Delete `LoginPage.tsx`, `Layout.tsx`, `ProtectedRoute.tsx`, `AuthProvider.tsx`, `HomePage.tsx`, `NotFoundPage.tsx`
5. Delete corresponding test files
6. Update manifest schema to add `features` section with `requiresAuth`
7. Update dynamic loader to accept slot ID target

**Phase 2 — Verify:**

- Existing `mfe-widget` loads into `main-slot`
- Auth initializes from cookie
- Unauthenticated user on protected route redirects to `/login` (even though login MFE not built — accept 404 page temporarily)
- Shell size measured under 250 lines
- Bootstrap failure shows critical error page

**Phase 3 — Rollback (if needed):**

- Revert commit; shell returns to fat state
- No data migration or backend changes to undo

## Open Questions

- Should the fallback minimal header show anything user-identifying (email) before chrome MFEs load, or stay generic? (Recommendation: generic — user data comes from chrome MFE)
- Should we keep `HomePage`/`NotFoundPage` as static HTML fallbacks inside the shell, or defer them to a future "utility MFE"? (Recommendation: static HTML in `index.html` for now)
- How does bootstrap surface auth-refresh errors to MFEs already mounted? (Recommendation: via `window.__MFE_AUTH__.onTokenChange` — same channel MFEs already use)
