## 1. Package Scaffold

- [ ] 1.1 Create `apps/mfe-header/` with `package.json` (name `@mfe-runtine/mfe-header`, private, version `0.1.0`)
- [ ] 1.2 Copy the workspace structure from `apps/mfe-widget/` as a starting point (vite config, tsconfig, vitest config)
- [ ] 1.3 Add dependencies: `react`, `react-dom` via catalog; workspace deps on `@mfe-runtine/auth`, `@mfe-runtine/events`, `@mfe-runtine/dynamic-loader` (for types)
- [ ] 1.4 Add dev dependencies aligned with widget (testing-library, happy-dom, `@module-federation/vite`)
- [ ] 1.5 Configure `vite.config.ts` with Module Federation: `name: "header"`, `exposes: { "./lifecycle": "./src/index.tsx", "./Header": "./src/Header.tsx" }`, shared React singletons
- [ ] 1.6 Configure `vitest.config.ts` with happy-dom env, coverage thresholds (statements 90, branches 85, functions 90, lines 90)
- [ ] 1.7 Wire package into Turborepo (`turbo.json` already covers `build`, `test`; verify)

## 2. Root Header Component

- [ ] 2.1 Create `apps/mfe-header/src/Header.tsx` accepting `MFEProps` (user, isAuthenticated, theme, config)
- [ ] 2.2 Render layout: Logo | Navigation | Spacer | SearchBar | ThemeToggle | UserMenu
- [ ] 2.3 Apply theme class based on `props.theme` (light default; dark applies `.header--dark`)
- [ ] 2.4 Provide a11y landmarks: outer element is `<header role="banner">`, navigation uses `<nav aria-label="Primary">`

## 3. Logo Component

- [ ] 3.1 Create `apps/mfe-header/src/components/Logo.tsx`
- [ ] 3.2 Accept `src` prop; fallback to default corporate SVG shipped inline
- [ ] 3.3 Render as clickable element; click triggers navigation to `/`
- [ ] 3.4 Include accessible label `Home` for screen readers

## 4. Navigation Component

- [ ] 4.1 Create `apps/mfe-header/src/components/Navigation.tsx` accepting `navItems: NavItem[]` and current `pathname` + `userRoles`
- [ ] 4.2 Filter items by role: item is hidden if `requiredRoles` is non-empty and none match the user's roles
- [ ] 4.3 Compute active state: exact match OR pathname starts with item path
- [ ] 4.4 Set `aria-current="page"` on the active item
- [ ] 4.5 Handle click: prevent default, call navigation helper
- [ ] 4.6 Add keyboard focus outlines and hover styles

## 5. UserMenu Component

- [ ] 5.1 Create `apps/mfe-header/src/components/UserMenu.tsx`
- [ ] 5.2 Read auth state via a hook (see section 8)
- [ ] 5.3 Authenticated: show avatar/initials + display name; on click open a dropdown with `Profile`, `Settings`, `Logout`
- [ ] 5.4 Unauthenticated: render a `Sign in` button navigating to `/login`
- [ ] 5.5 Logout: call `window.__MFE_AUTH__.logout()`; on success navigate to `/login`
- [ ] 5.6 Handle missing `window.__MFE_AUTH__`: render unauthenticated menu and `console.warn` in dev

## 6. SearchBar and ThemeToggle Stubs

- [ ] 6.1 Create `apps/mfe-header/src/components/SearchBar.tsx` — visual input with `disabled` placeholder `Search coming soon`
- [ ] 6.2 Create `apps/mfe-header/src/components/ThemeToggle.tsx` — button that emits `mfe:theme:toggle` event and toggles a local visual state
- [ ] 6.3 Document that these are stubs in `README.md` with a link to their follow-up tickets

## 7. Navigation Helper

- [ ] 7.1 Create `apps/mfe-header/src/utils/navigate.ts` exporting `navigate(path)` that prefers `window.__MFE_NAVIGATION__.navigate` and falls back to `emitMFEEvent('mfe:navigate', { path })`
- [ ] 7.2 Add tests for both branches

## 8. Hooks

- [ ] 8.1 Create `apps/mfe-header/src/hooks/useCurrentUser.ts` — reads `window.__MFE_AUTH__`, subscribes to token changes via `onTokenChange`, returns `{ user, isAuthenticated }`; cleans up on unmount
- [ ] 8.2 Create `apps/mfe-header/src/hooks/useActiveRoute.ts` — subscribes to `popstate` and (if available) navigation bridge events; returns current pathname
- [ ] 8.3 Add unit tests for both hooks covering subscribe/unsubscribe, event responses, missing globals

## 9. Lifecycle Wrapper

- [ ] 9.1 Create `apps/mfe-header/src/index.tsx` implementing `MFELifecycle`
- [ ] 9.2 `bootstrap`: log dev message; resolve immediately
- [ ] 9.3 `mount(props)`: `createRoot(props.container)`; render `<StrictMode><Header {...props} /></StrictMode>`; store root at module scope
- [ ] 9.4 `unmount`: `root?.unmount()`; null the reference
- [ ] 9.5 `update(props)`: re-render into existing root with merged props
- [ ] 9.6 Handle double-mount defensively (StrictMode) — reuse root if already created

## 10. Manifest & Shell Integration

- [ ] 10.1 Update `apps/website/public/remotes.config.json` to include `chrome.header`:
  ```json
  { "chrome": { "header": { "mfe": "header", "entryUrl": "http://localhost:5175/remoteEntry.js", "config": { "navItems": [...] } } } }
  ```
- [ ] 10.2 Update `scripts/generate-config.ts` to add the `chrome` section for discovered header MFE
- [ ] 10.3 Assign a dedicated dev port (e.g., 5175) in header's `vite.config.ts`
- [ ] 10.4 Manually verify: `pnpm dev` in both `apps/website` and `apps/mfe-header` results in the header appearing in the shell

## 11. Bundle Size Enforcement

- [ ] 11.1 Add a small script `scripts/check-header-size.ts` that inspects the header's `dist/` gzipped size and exits non-zero above 50 KB
- [ ] 11.2 Wire it into `apps/mfe-header/package.json` postbuild step
- [ ] 11.3 Wire into CI via Turborepo build task

## 12. Tests

- [ ] 12.1 Unit tests for `Logo` (renders, click navigates)
- [ ] 12.2 Unit tests for `Navigation` (renders items, role filtering, active state, click behavior)
- [ ] 12.3 Unit tests for `UserMenu` (auth/unauth branches, logout, missing global warning)
- [ ] 12.4 Unit tests for `SearchBar` and `ThemeToggle` (basic render + click)
- [ ] 12.5 Unit tests for `navigate` helper (bridge vs event-bus fallback)
- [ ] 12.6 Unit tests for `useCurrentUser` (subscribe/cleanup, token change)
- [ ] 12.7 Unit tests for `useActiveRoute` (popstate response, bridge subscription cleanup)
- [ ] 12.8 Unit tests for the lifecycle wrapper (mount, unmount, update, re-mount without leaking)
- [ ] 12.9 Integration test: mount the header through the loader against a fake shell DOM; verify DOM presence in `header-slot`
- [ ] 12.10 Coverage report ≥90% statements/lines, ≥85% branches

## 13. Documentation

- [ ] 13.1 Write `apps/mfe-header/README.md` documenting: purpose, run standalone, integrate into a shell, config schema, override options
- [ ] 13.2 Update `CONTEXT.md` to reference `mfe-header` as the first chrome MFE and cross-link to ADR-0004
- [ ] 13.3 Add screenshots (optional) showing the header in customer-shell and admin-shell manifests

## 14. Verification

- [ ] 14.1 `pnpm build --filter @mfe-runtine/mfe-header` succeeds with size under 50 KB
- [ ] 14.2 `pnpm test` at repo root passes (existing 117+ tests plus new header tests)
- [ ] 14.3 Manual verification: shell renders the header on load; navigating between routes preserves the header; token refresh updates the user menu
- [ ] 14.4 Manual verification: opening the shell without `window.__MFE_AUTH__` (simulate misconfig) renders unauthenticated header and logs a warning
- [ ] 14.5 Confirm the header is NOT unmounted when feature MFEs swap in `main-slot`
