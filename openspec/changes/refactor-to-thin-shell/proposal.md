## Why

The current shell (`apps/website`) contains ~476 lines of business logic (AuthProvider, Layout, LoginPage, ProtectedRoute) that will be duplicated across every future shell (customer-shell, admin-shell, marketing-shell). This violates the Chrome MFE pattern (ADR-0004) where the shell should be a thin orchestrator (~200 lines) that only bootstraps auth and coordinates MFE loading. Refactoring now — before adding more shells — prevents multiplicative duplication and enables independent team ownership of chrome components.

## What Changes

- **BREAKING**: Extract `AuthProvider`, `LoginPage`, `Layout`, and `ProtectedRoute` from `apps/website/src/` into a preparation area for chrome MFE migration
- Reduce shell (`apps/website`) to only: HTML template with slots, bootstrap logic, manifest fetching, and CSS grid layout
- Introduce standard DOM slot placeholders (`header-slot`, `sidebar-slot`, `main-slot`, `footer-slot`) in `index.html`
- Replace React-based routing in shell with vanilla JS route matching for feature MFEs
- Keep `AuthProvider` logic accessible via `window.__MFE_AUTH__` global (already partially implemented as `window.__AUTH__`)
- **BREAKING**: Remove business-logic components from shell that will migrate to MFEs in later changes (`refactor-to-thin-shell` prepares the ground, follow-up changes extract chrome MFEs)

## Capabilities

### New Capabilities

- `thin-shell-bootstrap`: How the shell initializes auth, fetches manifest, loads MFEs into slots, and handles route changes with minimal (~200 line) footprint

### Modified Capabilities

- `module-federation-host`: Host shell no longer renders React components directly; renders empty slots that MFEs fill via lifecycle mount
- `hybrid-routing`: Shell-side routing becomes vanilla URL-to-MFE matching; React Router usage moves entirely into MFEs
- `route-guards`: Authentication guards move from shell React components to shell bootstrap logic (before MFE mount)

## Impact

**Affected code:**

- `apps/website/src/App.tsx` — reduced to bootstrap coordinator
- `apps/website/src/main.tsx` — becomes primary entry point (~50 lines)
- `apps/website/src/providers/AuthProvider.tsx` — logic preserved, React wrapper removed
- `apps/website/src/components/Layout.tsx` — removed (migrates to `mfe-header` in future change)
- `apps/website/src/components/LoginPage.tsx` — removed (migrates to `@mfe-runtine/auth-ui` in future change)
- `apps/website/src/components/ProtectedRoute.tsx` — removed (auth check moves to bootstrap)
- `apps/website/index.html` — adds slot placeholders and base grid CSS
- `apps/website/src/style.css` — reduced to layout-only CSS

**Affected dependencies:**

- `apps/website/package.json` — remove `react-router` from shell dependencies (still used by MFEs)
- Existing MFE (`apps/mfe-widget`) continues working unchanged

**Affected tests:**

- Shell tests (`apps/website/src/**/*.test.tsx`) for removed components will be deleted
- New tests for bootstrap logic and slot management
- MFE tests unchanged

**Migration risk:**

- Login flow will be temporarily broken until `extract-auth-ui-package` change lands
- This change should be paired with `extract-auth-ui-package` in same release cycle
- Rollback plan: keep components in feature branch until follow-up changes ready
