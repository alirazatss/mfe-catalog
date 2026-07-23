## Context

The Chrome MFE pattern says the shell renders empty slots and MFEs fill them (ADR-0004). We have three preceding changes lining up that groundwork:

- `refactor-to-thin-shell` — creates slots, vanilla bootstrap, and manifest schema with `chrome` section
- `mfe-lifecycle-contract` — defines the `bootstrap`/`mount`/`unmount`/`update` contract
- `extract-auth-ui-package` — publishes `@mfe-runtine/auth-ui` with `setupAuthBridge` that populates `window.__MFE_AUTH__`

This change builds the first real chrome MFE — the corporate header — and validates the whole stack. It becomes the reference implementation for future chrome MFEs (`mfe-sidebar`, `mfe-footer`) and defines conventions (theme handling, active-route highlighting, cross-MFE navigation, user context).

**Stakeholders:**

- Design/Platform team (owns visual design and long-term maintenance of the header)
- Every shell team (consumes the header — no per-shell modification allowed)
- Auth team (header consumes `window.__MFE_AUTH__`)

**Constraints:**

- Chrome MFEs mount ONCE per page load and persist across route changes
- Header cannot import React Router; it uses `window.location` and navigation bridge for URL handling
- Header must respond to token change events without remounting
- Bundle size ≤ 50 KB gzipped (chrome MFEs are always loaded — they cannot be heavy)
- Must render usable content within 200 ms of mount (soft target)
- Corporate branding must match `@mfe-runtine/auth-ui` theme tokens

## Goals / Non-Goals

**Goals:**

- Corporate-branded header rendered from a Module Federation remote
- Persistent mount (loaded once at shell bootstrap, never remounted while page is alive)
- Reads current user from `window.__MFE_AUTH__`
- Navigation clicks trigger cross-MFE navigation (via `mfe:navigate` event and, once available, `window.__MFE_NAVIGATION__.navigate`)
- Active nav item highlighted based on `window.location.pathname`
- Logout button calls `window.__MFE_AUTH__.logout()`
- Theme prop from shell drives visual theme (light/dark)
- Comprehensive unit tests (≥90% coverage)
- Runs standalone (`pnpm dev` in `apps/mfe-header`) for isolated development

**Non-Goals:**

- Real search implementation (search bar is a stub; search functionality belongs to a future search MFE or backend integration)
- Real theme switching persistence (toggle emits an event; the shell decides what to do)
- Notification bell functionality (deferred — will live in a future notifications MFE)
- Multi-language content (i18n is a cross-cutting concern for another change)
- Building `mfe-sidebar` or `mfe-footer` (separate changes)
- Setting up CDN deployment infrastructure (separate infrastructure change)

## Decisions

### Decision 1: Header data comes from manifest, not from shell props

The manifest entry for the header includes a `config` object with navigation items:

```json
{
  "chrome": {
    "header": {
      "mfe": "header",
      "entryUrl": "...",
      "config": {
        "navItems": [
          { "label": "Widgets", "path": "/widget", "requiredRoles": [] },
          { "label": "Dashboard", "path": "/dashboard", "requiredRoles": [] },
          { "label": "Admin", "path": "/admin", "requiredRoles": ["admin"] }
        ]
      }
    }
  }
}
```

The loader forwards this via `MFEProps.config`. The header renders navigation based on this list and the current user's roles.

**Rationale:**

- Different shells can offer different navigation without changing the header code
- Adding a new nav item requires updating the manifest, not redeploying the header
- Role gating handled declaratively

**Alternatives considered:**

- Hard-coded nav in the header (rejected — every shell would need a different build)
- Nav config fetched by header at runtime (rejected — adds another network round trip and failure mode)

### Decision 2: Header uses event bus for navigation (v1), migrates to bridge (v2)

Until `navigation-bridge` change lands, the header emits `mfe:navigate` events on `@mfe-runtine/events` (the shell already listens for these). Once the bridge exists, the header calls `window.__MFE_NAVIGATION__.navigate(path)`. The header code SHALL feature-detect the bridge at runtime.

```typescript
function navigate(path: string) {
  if (window.__MFE_NAVIGATION__) {
    window.__MFE_NAVIGATION__.navigate(path);
  } else {
    emitMFEEvent(MFE_EVENTS.NAVIGATE, { path });
  }
}
```

**Rationale:**

- Header can ship before the bridge exists
- No coordination required between changes
- Feature detection is cheap

### Decision 3: Active route highlighting via `popstate` subscription

The header listens for `popstate` and (once available) navigation-bridge events to update its active-route state without re-rendering the whole tree.

```typescript
const [pathname, setPathname] = useState(window.location.pathname);
useEffect(() => {
  const handler = () => setPathname(window.location.pathname);
  window.addEventListener("popstate", handler);
  const cleanupNav = window.__MFE_NAVIGATION__?.onNavigate(handler);
  return () => {
    window.removeEventListener("popstate", handler);
    cleanupNav?.();
  };
}, []);
```

**Rationale:**

- Works without knowing anything about the shell's router
- Cleans up properly on unmount

### Decision 4: User info decoded from JWT via `@mfe-runtine/auth`

The header uses a helper from `@mfe-runtine/auth` to decode the JWT and extract `email`, `name`, `roles`. It does NOT parse the JWT inline.

**Rationale:**

- Reuse existing tested utility
- Keep JWT format assumptions in one place

### Decision 5: Bundle budget enforced in CI

`apps/mfe-header/vite.config.ts` sets a size hint; a CI check fails the build if the gzipped bundle exceeds 50 KB. This prevents chrome MFEs from bloating over time.

**Rationale:**

- Chrome MFEs are always loaded — they must stay small
- Guard against feature creep with an automated check

## Risks / Trade-offs

- **[Header stale during long sessions]** → Header subscribes to `mfe:auth:token-updated` and updates the user display without remounting; test coverage includes long-session simulation with mock token refresh
- **[Corporate branding drift with `@mfe-runtine/auth-ui`]** → Both packages read from the same tokens; short-term inline, follow-up change consolidates into `@mfe-runtine/ui-components`
- **[Navigation event failure]** → Feature-detect bridge and fall back to event bus; both paths tested
- **[CDN not yet available]** → Ship the MFE via local dev server for MVP; production deploy tracked separately
- **[Header size grows]** → CI bundle-size check fails the build above 50 KB; enforce in the same PR as this change
- **[Role-based nav visibility leak]** → Hiding a nav item is UI-only; the shell's route guards (from `refactor-to-thin-shell`) remain the real gate; document this clearly

## Migration Plan

**Phase 1 — Package Scaffold:**

1. Create `apps/mfe-header/` mirroring the `apps/mfe-widget/` layout
2. Set up Vite + Module Federation with `./lifecycle` exposure
3. Add tests infrastructure (`vitest.config.ts`)

**Phase 2 — Components:**

1. Implement `Logo`, `Navigation`, `UserMenu`, `SearchBar` (stub), `ThemeToggle` (stub)
2. Wire navigation clicks to bridge/event-bus fallback
3. Wire logout to `window.__MFE_AUTH__.logout()`
4. Add hooks for current user, active route

**Phase 3 — Lifecycle Wrapper:**

1. `src/index.tsx` implements `bootstrap` (no-op), `mount` (createRoot + render), `unmount` (root.unmount), `update` (re-render with new props)

**Phase 4 — Integration:**

1. Add manifest entry pointing at the local dev server
2. Verify the shell mounts header into `header-slot` on bootstrap
3. Verify feature MFE swaps in `main-slot` leave the header untouched

**Phase 5 — Tests:**

1. Unit tests for all components/hooks
2. Integration test that mounts the full lifecycle
3. CI bundle-size check

**Rollback:**

- Remove the manifest `chrome.header` entry — shell falls back to static header
- The MFE code remains for later re-enable

## Open Questions

- Should the header allow shells to override the logo via prop (in addition to manifest config)? (Recommendation: yes — manifest is default, prop can override for tests/preview environments)
- What happens when the user has zero navigation items visible (e.g., unauthenticated on a shell with only auth-required routes)? (Recommendation: hide the nav section entirely and show only logo + `Sign in` CTA)
- Should the header expose keyboard shortcuts (e.g., `/` to focus search)? (Recommendation: v1 no; add in a follow-up)
- Should the header handle failures of `window.__MFE_AUTH__` gracefully? (Recommendation: yes — if the global is missing, render an unauthenticated header state and log a warning)
