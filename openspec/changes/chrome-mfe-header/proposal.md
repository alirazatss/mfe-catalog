## Why

The thin shell (from `refactor-to-thin-shell`) leaves the `header-slot` empty except for a minimal static fallback. Users need a real header — logo, navigation menu, user avatar, logout — and every future shell (customer, admin, marketing) needs the same corporate-branded header. Following the Chrome MFE pattern (ADR-0004), the header SHALL be its own MFE deployed to CDN, loaded by every shell into `header-slot`, and updated independently by the Design/Platform team. Building this MFE also validates the entire lifecycle contract, slot mounting, and cross-MFE navigation end-to-end.

## What Changes

- Create a new MFE `apps/mfe-header/` implementing the `MFELifecycle` contract from `mfe-lifecycle-contract` change
- Implement corporate-branded header UI: logo, primary navigation, user menu (avatar, name, logout), search stub, theme toggle stub
- Header reads current user via `window.__MFE_AUTH__.getToken()` and decoded JWT claims
- Header triggers cross-MFE navigation via `window.__MFE_NAVIGATION__.navigate(path)` (contract established in `navigation-bridge` change; header uses the existing `mfe:navigate` event bus as a fallback until the bridge lands)
- Header subscribes to `window.__MFE_AUTH__.onTokenChange` to update user display when auth state changes
- Header persists across route changes (chrome MFE — mounted once at bootstrap, never unmounted while shell is alive)
- Package publishes to CDN under `cdn.example.com/<env>/mfe-header@<version>/remoteEntry.js`
- Shell manifest updated to include the header under `manifest.chrome.header`
- **BREAKING**: The static fallback header in `apps/website/index.html` is replaced by the MFE-driven header once the MFE loads; static content remains as a pre-hydration placeholder

## Capabilities

### New Capabilities

- `chrome-mfe-header`: The persistent header micro-frontend that renders corporate branding, primary navigation, and user menu across all shells; owned by Design/Platform team

## Impact

**Affected code:**

- New package `apps/mfe-header/` with:
  - `src/index.tsx` — lifecycle wrapper (bootstrap/mount/unmount/update)
  - `src/Header.tsx` — root React component
  - `src/components/Logo.tsx`
  - `src/components/Navigation.tsx` — navigation items driven by props/manifest
  - `src/components/UserMenu.tsx` — avatar, name, logout button
  - `src/components/SearchBar.tsx` — stub component (real search deferred)
  - `src/components/ThemeToggle.tsx` — stub component (real theming deferred)
  - `src/hooks/useCurrentUser.ts` — reads/subscribes to `window.__MFE_AUTH__`
  - `src/hooks/useActiveRoute.ts` — highlights active navigation item using `window.location.pathname`
  - `vite.config.ts` — Module Federation config exposing `./lifecycle` (and optionally `./Header` for tests)
  - `tests/*.test.tsx` — unit tests for hooks and components
- `apps/website/public/remotes.config.json` — add `chrome.header` entry pointing at the new MFE
- `apps/website/src/main.ts` — no code changes (loader already mounts chrome MFEs via manifest); manifest addition alone drives header mount
- `packages/monorepo-tools/` — extend discovery to recognize header MFE (already discovers `apps/mfe-*`, so no change needed unless slot metadata added)

**Affected dependencies:**

- `apps/mfe-header/package.json` — `react`, `react-dom` (peer/direct via catalog), `@mf-mono/dynamic-loader: workspace:*` (for types), `@mf-mono/events: workspace:*` (for navigation event fallback), `@mf-mono/auth: workspace:*` (for JWT decode utility)
- No new npm dependencies

**Affected tests:**

- New unit tests in `apps/mfe-header/tests/` covering: lifecycle wrapper (mount/unmount/update), Header component (renders logo, nav, user menu), UserMenu (shows email, logout triggers `window.__MFE_AUTH__.logout()`), Navigation (highlights active route, dispatches navigation), hooks (respond to auth events, cleanup on unmount)
- Integration test in shell: full bootstrap mounts `mfe-header` into `header-slot`, header remains mounted while feature MFEs swap in `main-slot`

**Migration risk:**

- Requires `mfe-lifecycle-contract` change to be in place (loader must support the contract)
- Requires the manifest schema to include `chrome` section (from `refactor-to-thin-shell` change)
- Corporate branding tokens must align with `@mf-mono/auth-ui` — coordinate with Design team; short-term, inline the corporate colors here and refactor into `@mf-mono/ui-components` in a later change
- CDN deployment pipeline is not built yet — during this change, the MFE is served via `pnpm dev` and the shell manifest points at localhost; production CDN deploy is a follow-up infrastructure change
