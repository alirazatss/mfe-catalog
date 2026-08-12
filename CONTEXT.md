# Micro-Frontend System - Context

> **Current state vs target architecture**: this glossary describes the target pattern the platform is converging on. Today there is one shell in the repo, `apps/shells/website` (the reference/pilot shell — not yet split by domain), one monorepo (no separate `mf-platform`/`mf-catalog`/shell repos per ADR-0001's future split), and MFEs are served from Azure Blob Storage per environment (see ADR-0009/ADR-0010), not a generic CDN. Where an entry below states a fact about the current implementation, it has been corrected to match the codebase; illustrative names like `customer-shell`/`admin-shell`/`cdn.example.com` remain as pattern examples for future shells.

## Glossary

### Shell

The **thin host container** that owns a domain and orchestrates MFE loading.

**Properties:**

- Owns the domain (e.g., `customer.example.com`, `admin.example.com`)
- ~200 lines of code total (bootstrap + slot coordination)
- NO business logic
- NO UI components (except empty layout template)
- Provides slot placeholders for MFEs to fill
- Manages global concerns (auth bootstrap, MFE loading, error boundaries)
- Deployed to dedicated Kubernetes cluster per environment

**What shell DOES:**

- Bootstrap authentication (`tokenManager.initialize()`)
- Setup `window.__MFE_AUTH__` global
- Fetch and validate the remote config (currently `/remotes.config.json`, served by the shell's own build output; a versioned, CDN-hosted manifest is proposed by the in-progress `production-deployment-architecture` change but not yet consumed at runtime)
- Load Chrome MFEs into slots (header, sidebar, footer)
- Load Feature MFEs based on route
- Basic CSS grid layout (no styling)

**What shell DOES NOT do:**

- No React components (except optional error boundary)
- No auth UI (that's in `@mfe-runtime/auth-ui`)
- No navigation logic (that's in `mfe-header`)
- No feature logic (that's in feature MFEs)

**Examples:**

- `website` - The current reference shell in this repo (`apps/shells/website`); implements the thin-shell pattern below today
- `customer-shell` - Future customer-facing portal (illustrative name, not yet created)
- `admin-shell` - Future internal admin dashboard (illustrative name, not yet created)
- `marketing-shell` - Future public marketing website (illustrative name, not yet created)

---

### MFE (Micro-Frontend)

A **loadable module** deployed to CDN, loaded by shells.

**Two types:**

#### Chrome MFE (Always Mounted)

UI infrastructure that stays constant across routes.

**Properties:**

- Loaded during shell bootstrap
- Mounted to fixed slots (header-slot, sidebar-slot, footer-slot)
- Long-lived (persists across route changes)
- Owned by Design/Platform Team
- Used by multiple shells

**Examples:**

- `mfe-header` - Corporate header with navigation, user menu, search
- `mfe-sidebar` - Left navigation menu
- `mfe-footer` - Legal/corporate footer
- `mfe-notifications` - Global notification bar

#### Feature MFE (Route-Based)

Business features loaded based on URL route.

**Properties:**

- Loaded when user navigates to matching route
- Mounted to main-slot
- Mount/unmount on route changes
- Owned by product/feature teams
- Can be shell-specific or shared

**Examples:**

- `mfe-widget` - Widget management
- `mfe-dashboard` - Analytics dashboard
- `mfe-analytics` - Admin analytics
- `mfe-settings` - User settings
- `landing-page` - Standalone marketing page

---

### Shared Package

A **npm library** used by shells and/or MFEs.

**Two categories:**

#### Shell + MFE Shared (npm published)

Used by both shells and MFEs, must be npm.

**Examples:**

- `@mfe-runtime/auth` - TokenManager logic (no UI)
- `@mfe-runtime/auth-ui` - LoginPage, LogoutPage components
- `@mfe-runtime/dynamic-loader` - MFE loader utility
- `@mfe-runtime/events` - EventBus for cross-MFE communication

#### MFE-Only Shared (workspace dependency)

Only MFEs use these, stays within mf-catalog workspace.

**Examples:**

- `ui-components` - Design system for MFEs
- `utils` - Shared MFE utilities
- `api-client` - Shared API client factory

---

### CDN (Content Delivery Network)

Central storage for **all MFE builds** across all environments.

**Structure:**

```
cdn.example.com/
├── prod/
│   ├── mfe-header@1.2.0/remoteEntry.js
│   ├── mfe-sidebar@1.0.0/remoteEntry.js
│   ├── mfe-footer@1.1.0/remoteEntry.js
│   ├── mfe-widget@2.1.0/remoteEntry.js
│   └── mfe-dashboard@1.5.0/remoteEntry.js
├── sst/
│   └── ...
├── dev/
│   └── ...
└── demo/
    └── ...
```

---

### Manifest

A **JSON configuration file** that tells shell which MFEs to load.

**Structure:**

```json
{
  "chrome": {
    "header": { "entryUrl": "https://cdn.example.com/prod/mfe-header@1.2.0/remoteEntry.js" },
    "sidebar": { "entryUrl": "https://cdn.example.com/prod/mfe-sidebar@1.0.0/remoteEntry.js" },
    "footer": { "entryUrl": "https://cdn.example.com/prod/mfe-footer@1.1.0/remoteEntry.js" }
  },
  "features": {
    "/widgets/*": { "entryUrl": "https://cdn.example.com/prod/mfe-widget@2.1.0/remoteEntry.js" },
    "/dashboard/*": {
      "entryUrl": "https://cdn.example.com/prod/mfe-dashboard@1.5.0/remoteEntry.js"
    }
  }
}
```

**Properties:**

- Shell-specific (each shell has different manifest)
- Environment-specific (dev/sst/demo/prod)
- Separates chrome MFEs (always loaded) from feature MFEs (route-based)
- Generated during shell build

---

### Environment

A **deployment stage** representing stability/testing level.

**Tiers:**

- `dev` - Development builds, latest changes
- `sst` - Staging/pre-production testing
- `demo` - Customer demos, stable builds
- `prod` - Production, customer-facing

**Properties:**

- Each shell has ALL four environments (separate K8s clusters)
- MFEs deploy to CDN with environment-specific paths
- Shell manifest points to environment-specific MFE versions

---

### Floating Pointer

A **deployment path** that always points to the latest dev build via overwriting.

**Examples:**

- `mfes-dev/mfe-widget/dev/` - Overwritten on every push to `main`
- `dev-shell/` - Overwritten on every push to `main`

**Properties:**

- Mutable (new commits overwrite existing files)
- Cache headers: `no-cache, must-revalidate`
- Zero version management overhead
- Dev shell `remotes.config.dev.json` points here
- No historical builds accessible (only latest)

**Introduced in:** [ADR-0009 A3 (Floating Pointers for Dev)](./docs/adr/0009-azure-blob-deployment-pipeline.md#a3-floating-pointers-for-dev)

---

### Local Port Map

A **canonical development port assignment table** that maps each shell or MFE to a fixed local port.

**Properties:**

- Single source of truth for local dev port allocation
- Prevents manual edits when a preferred dev port is already taken
- Used by local dev server startup and manifest/config generation
- Records the resolved port for each app so the manifest stays in sync with reality

**Examples:**

- `website` - shell on `5173`
- `mfe-widget` - MFE on `5174`
- `mfe-landing-page` - MFE on `5175`

**Purpose:**

- Keep local manifest URLs stable across runs
- Make dev server ports predictable for shell-to-MFE linking
- Allow dev tooling to resolve and persist an alternate free port when the preferred port is occupied

---

### Immutable Dev Artifact

A **commit-addressable dev build** deployed to `sha-<short>/` paths for reproducibility.

**Examples:**

- `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js`
- `dev-shell/sha-f5e6d7c8/index.html`

**Properties:**

- Immutable (write-once, conditional upload tolerates re-runs)
- Cache headers: `public, max-age=31536000, immutable`
- Retained for 30 days (lifecycle policy deletes after TTL)
- Addressed by 8-char commit SHA prefix
- Enables "load exact build from 3 days ago" debugging

**Use Cases:**

- Debugging: "This bug appeared after commit a1b2c3d4, test that exact build"
- Provenance: "Which commit produced deployed artifact X?"

**Introduced in:** [ADR-0010 A1 (Immutable SHA Paths)](./docs/adr/0010-dev-preview-deployments.md#a1-immutable-sha-paths-alongside-floating-dev-pointers)

---

### Preview Deployment

A **PR-scoped isolated dev environment** for pre-merge verification.

**Path Structure:**

- `mfes-dev/<mfe>/pr-<number>/` - MFE builds from PR branch
- `dev-shell/pr-<number>/` - Shell with auto-generated config pointing to PR artifacts

**Properties:**

- Isolated (PR 42 never affects PR 43 or dev/prod)
- Cleanup on PR close (workflow deletes all `pr-<number>/` blobs)
- Lifecycle backstop: 14-day TTL deletes stale previews
- Same-repo boundary: fork PRs cannot trigger preview deploys (OIDC guard)
- Preview shell config auto-generated: changed MFEs use `pr-<number>/` URLs, unchanged use `dev/` URLs

**Verification:**

- GitHub Actions posts sticky PR comment with preview URLs
- Reviewers click link to test live before merge

**Security:**

- `pull_request` trigger (not `pull_request_target`)
- Job-level guard: `github.event.pull_request.head.repo.full_name == github.repository`
- Fork PRs skip deploy jobs (no Azure credentials granted)

**Introduced in:** [ADR-0010 A2 (PR-Scoped Preview Deployments)](./docs/adr/0010-dev-preview-deployments.md#a2-pr-scoped-preview-deployments-for-same-repo-prs)

---

### Build Metadata File

A **machine-readable provenance record** uploaded alongside all dev/SHA/preview artifacts.

**Filename:** `build-info.json`

**Schema:**

```json
{
  "commitSha": "a1b2c3d4e5f6789012345678901234567890abcd",
  "runId": "12345678",
  "workflow": "Deploy MFEs (Turborepo)",
  "timestamp": "2026-08-05T14:23:00Z",
  "prNumber": "42" // present for preview deploys only
}
```

**Purpose:**

- Provenance: "Which commit produced this deployed artifact?"
- Debugging: "This bug appeared after GitHub Actions run #12345678"
- Verification: Shell or MFE can fetch and log metadata on load

**Introduced in:** [ADR-0010 A3 (Build Metadata Files)](./docs/adr/0010-dev-preview-deployments.md#a3-build-metadata-files)

---

### Slot

A **DOM placeholder** where MFEs mount their content.

**Standard slots:**

- `header-slot` - Top of page (Chrome MFE)
- `sidebar-slot` - Left navigation (Chrome MFE)
- `main-slot` - Feature content area (Feature MFE)
- `footer-slot` - Bottom of page (Chrome MFE)

**Custom slots** can be added per shell as needed.

---

### Navigation Bridge

A **global API** exposed by the shell for cross-MFE navigation.

**Access:** `window.__MFE_NAVIGATION__`

**Purpose:**

- Navigate between MFEs (e.g., header → widgets page)
- Coordinate URL changes with MFE loading
- Notify all MFEs of navigation events
- Provide browser history controls

**Two-layer routing:**

- **Layer 1 (Shell)**: `window.__MFE_NAVIGATION__` for cross-MFE navigation
- **Layer 2 (MFE)**: React Router (with `basename`) for internal routes

**When to use each:**

- Cross-MFE (`/widgets` → `/dashboard`) → Use Navigation Bridge
- Internal (`/widgets/1` → `/widgets/1/edit`) → Use React Router

---

## Final Architecture

### Repository Structure

```
┌────────────────────────────────────────────────────────────┐
│  Repo 1: mf-catalog (Multi-team via CODEOWNERS)            │
│                                                             │
│  ├── mfes/                                                  │
│  │   ├── mfe-header/       ← Chrome (Design Team)          │
│  │   ├── mfe-sidebar/      ← Chrome (Design Team)          │
│  │   ├── mfe-footer/       ← Chrome (Design Team)          │
│  │   ├── mfe-widget/       ← Feature (Customer Team)       │
│  │   ├── mfe-dashboard/    ← Feature (Customer Team)       │
│  │   ├── mfe-analytics/    ← Feature (Admin Team)          │
│  │   ├── mfe-settings/     ← Feature (Admin Team)          │
│  │   └── landing-page/     ← Standalone (Marketing Team)   │
│  ├── packages/             ← MFE-only shared code          │
│  │   ├── ui-components/    ← Design system                 │
│  │   ├── utils/            ← Utilities                     │
│  │   └── api-client/       ← API client factory            │
│  ├── CODEOWNERS                                            │
│  └── .github/workflows/                                     │
│      └── deploy-changed-to-cdn.yml                          │
│                                                             │
│  Also publishes to npm (used by shells):                    │
│  ├── @mfe-runtime/auth         (TokenManager)                  │
│  ├── @mfe-runtime/auth-ui      (LoginPage)                     │
│  ├── @mfe-runtime/dynamic-loader (MFE loader)                  │
│  └── @mfe-runtime/events       (EventBus)                      │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Repo 2: customer-shell (Customer Team)                    │
│                                                             │
│  ├── src/                                                   │
│  │   ├── index.html        ← Empty layout template         │
│  │   ├── shell.ts          ← Bootstrap (~100 lines)        │
│  │   └── shell-base.css    ← Layout grid only              │
│  ├── k8s/                                                   │
│  │   ├── dev/                                              │
│  │   ├── sst/                                              │
│  │   ├── demo/                                             │
│  │   └── prod/                                             │
│  ├── manifest-dev.json                                      │
│  ├── manifest-sst.json                                      │
│  ├── manifest-demo.json                                     │
│  ├── manifest-prod.json                                     │
│  ├── package.json                                           │
│  │   dependencies:                                          │
│  │     "@mfe-runtime/auth": "^1.0.0"                           │
│  │     "@mfe-runtime/auth-ui": "^1.0.0"                        │
│  │     "@mfe-runtime/dynamic-loader": "^1.0.0"                 │
│  └── .github/workflows/deploy-k8s.yml                       │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Repo 3: admin-shell (Admin Team)                          │
│  (Same structure as customer-shell)                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  Repo 4: marketing-shell (Marketing Team) - Optional       │
│  (Same structure, may skip auth setup)                      │
└────────────────────────────────────────────────────────────┘
```

### Complete Loading Flow

```
1. User visits customer.example.com
   ↓
2. Shell HTML loads (empty template with slots)
   ↓
3. Shell.ts bootstrap begins:
   ├── tokenManager.initialize() → checks HttpOnly cookie
   ├── If cookie: refreshes and gets access token
   ├── If no cookie: renders <LoginPage /> from @mfe-runtime/auth-ui
   └── Sets up window.__MFE_AUTH__ global
   ↓
4. Fetch manifest-prod.json
   ↓
5. Load Chrome MFEs (parallel):
   ├── mfe-header → mounts to #header-slot
   ├── mfe-sidebar → mounts to #sidebar-slot
   └── mfe-footer → mounts to #footer-slot
   ↓
6. Load Feature MFE based on route:
   └── mfe-widget → mounts to #main-slot (URL: /widgets/*)
   ↓
7. All MFEs use window.__MFE_AUTH__.getToken() for API calls
   ↓
8. Shell listens for route changes:
   └── On navigation: unload old feature MFE, load new one
```

---

## Key Decisions

### 1. Repository Structure (ADR-0001)

**Three repository types:**

1. **`mf-catalog`** - All MFEs + shared MFE packages + npm packages for shells
2. **`customer-shell`** - Customer portal (Customer Team)
3. **`admin-shell`** - Admin dashboard (Admin Team)

**Rationale:**

- Different teams own different shells → separate repos for autonomy
- All MFEs share same CDN deployment flow → single mf-catalog repo
- npm packages published from mf-catalog reduce complexity
- CODEOWNERS ensures proper approvals per MFE

### 2. Authentication (ADR-0002)

**Shell owns authentication.** MFEs consume via `window.__MFE_AUTH__`.

**Why shell owns auth:**

- Bootstrap dependency (auth needed before MFE loader)
- Security scope (HttpOnly cookies tied to shell domain)
- Coordination (single refresh cycle across MFEs)
- User experience (login once, all MFEs work)

**Package split:**

- `@mfe-runtime/auth` - TokenManager class only (no UI)
- `@mfe-runtime/auth-ui` - LoginPage/LogoutPage components (corporate branded)

### 3. Login Location (ADR-0003)

**Login is NOT an MFE.** It's a React component in `@mfe-runtime/auth-ui` npm package.

**Why:**

- Bootstrap dependency (login needed BEFORE MFE loader ready)
- Reliability (npm package more reliable than CDN)
- No versioning benefit (login is single flow)
- Corporate branding centralized

### 4. Chrome MFE Pattern (ADR-0004)

**Shell is a thin coordinator** (~200 lines). All UI chrome are MFEs.

**Shell responsibilities:**

- Empty HTML template with slots
- Auth bootstrap
- Manifest fetching
- MFE loading orchestration
- Basic CSS grid layout

**Chrome MFEs:**

- `mfe-header` - Header with nav, user menu
- `mfe-sidebar` - Left navigation
- `mfe-footer` - Corporate footer

**Feature MFEs:**

- `mfe-widget`, `mfe-dashboard`, `mfe-analytics`, etc.

### 5. Cross-MFE Navigation (ADR-0005)

**Two-layer routing** with Global Navigation Bridge.

**Layer 1: Shell owns cross-MFE navigation**

```typescript
window.__MFE_NAVIGATION__ = {
  navigate(path, options),
  back(), forward(),
  getCurrentPath(),
  onNavigate(callback),
  isActive(path, options),
};
```

**Layer 2: MFEs own internal routing**

```typescript
// mfe-widget uses React Router
<BrowserRouter basename="/widgets">
  <Routes>
    <Route path="/" element={<WidgetList />} />
    <Route path="/:id" element={<WidgetDetail />} />
  </Routes>
</BrowserRouter>
```

**Rules:**

- Cross-MFE navigation (`/widgets` → `/dashboard`) → Use `window.__MFE_NAVIGATION__`
- Internal navigation (`/widgets/1` → `/widgets/1/edit`) → Use React Router
- Chrome MFEs (header, sidebar) → Always use Navigation Bridge

### 6. Single Sign-On

**Wildcard cookie domain** for SSO across shells.

```http
Set-Cookie: refreshToken=xyz;
  Domain=.example.com;       ← Wildcard
  HttpOnly; Secure; SameSite=Lax;
```

Result: User logs into `customer.example.com`, opens `admin.example.com`, SSO works automatically.

### 7. MFE Deployment (ADR-0009)

**Git tag-based releases to Azure Blob Storage with OIDC authentication.**

**Dev deploys** (push to `main`):

- MFEs → `mfes-dev/<mfe-name>/dev/` (floating pointer, auto-loads latest)
- Shell → `dev-shell/` container (raw blob URL)

**Prod deploys** (git tag `<artifact>-v<semver>`):

- MFEs → `mfes-prod/<mfe-name>/v<version>/` (versioned, immutable)
- Shell → `$web/v<version>/` (versioned) + `$web/` root (static website)
- Opens PR to update `remotes.config.prod.json` (not auto-merged)

**Config-only redeploys** (merge to `main` updating `remotes.config.prod.json`):

- Rebuilds shell with new config, deploys to `$web/` root only
- Use case: Point shell to newly published MFE version without cutting new shell version

See [ADR-0009](./docs/adr/0009-azure-blob-deployment-pipeline.md) for full deployment architecture, OIDC setup, RBAC scoping, and CDN migration path.

### 8. Team Structure

- **Platform/Design Team** - Owns npm packages + chrome MFEs
- **Customer Team** - Owns customer-shell + customer feature MFEs
- **Admin Team** - Owns admin-shell + admin feature MFEs
- **Marketing Team** - Owns marketing-shell + standalone MFEs

### 9. Graceful Failure Handling (ADR-0006)

**Fail gracefully with slot-level error boundaries.** Failed MFE doesn't break other MFEs.

**Error handling layers:**

1. **Bootstrap errors** → Show critical error page with reload
2. **Slot-level failures** → Show fallback UI with retry button
3. **Runtime errors** → React Error Boundaries per MFE
4. **Auth failures** → Retry with backoff, then redirect to login
5. **Manifest failures** → Retry with exponential backoff, fallback to cache

**Failure scenarios:**

- Header MFE fails → Sidebar/main still work, header shows retry
- Feature MFE crashes → Chrome MFEs continue, feature shows error
- Auth refresh fails → Auto-retry, then graceful logout with return URL
- Manifest fetch fails → Try cache (24h), then critical error
- Version mismatch → Slot error with technical details

**Error API:**

```typescript
window.__MFE_ERROR__ = {
  report(error: MFEError),
  onError(callback),
};
```

**Events:**

- `mfe:load:failed` - MFE failed to load from CDN
- `mfe:runtime:error` - MFE crashed at runtime
- `mfe:loaded` - MFE loaded successfully

### 10. MFE Lifecycle Contract (ADR-0007)

**Every MFE exports standardized lifecycle functions** (Single-SPA style).

**Required exports:**

```typescript
export async function bootstrap(props: MFEProps): Promise<void>
export async function mount(props: MFEProps): Promise<void>
export async function unmount(props: MFEProps): Promise<void>
export async function update?(props: MFEProps): Promise<void>  // Optional
```

**Lifecycle flow:**

1. **bootstrap** - One-time initialization (analytics, preload data)
2. **mount** - Create React root, render app, subscribe to events
3. **update** - Re-render with new props (theme, user changes)
4. **unmount** - Cleanup subscriptions, destroy React root

**Shell provides these props:**

- `container` - DOM element to mount in
- `slot` - Slot name (header-slot, main-slot, etc.)
- `user`, `isAuthenticated`, `theme`, `locale`
- `basePath` - React Router basename
- `onNavigate` - Cross-MFE navigation

**Vite config exposes lifecycle:**

```typescript
federation({
  exposes: {
    "./lifecycle": "./src/index.tsx", // NOT './App'
  },
});
```

### 11. Version Management & Upgrades (ADR-0008)

**Progressive Version Migration** allows gradual major upgrades (React 19 → 20).

**Three phases:**

1. **Steady State** - All MFEs on same version, singleton mode
2. **Migration Window** - Multiple versions coexist, non-singleton mode
3. **Cleanup** - Back to singleton on new version

**Coordination mechanisms:**

- **PNPM catalog** - Source of truth for versions in mf-catalog
- **`@mfe-runtime/versions`** - npm package publishes required/supported versions
- **Runtime validation** - Shell checks MFE versions on load
- **Compatibility matrix** - Documented per-MFE version status

**Upgrade timeline:**

- Minor/patch: Automated via Renovate, 24 hours
- Major upgrades: 3-6 months, team-by-team migration
- No coordination required (teams upgrade at own pace)

**Vite Module Federation config:**

```typescript
// Steady state
shared: {
  react: { singleton: true, requiredVersion: '19.1.0' }
}

// Migration window
shared: {
  react: {
    singleton: false,
    requiredVersion: '^19 || ^20'
  }
}
```

---

## Industry Standards Followed

### Reference Companies:

- **Spotify:** Chrome MFE pattern (Player, Sidebar, TopBar as MFEs)
- **Zalando:** `@zalando/auth-sdk` + chrome MFEs per team
- **DAZN:** ~150 line shell, everything else is MFE
- **Booking.com:** Modular chrome across product areas
- **American Express:** Card management via chrome MFE pattern

### Anti-Patterns Avoided:

❌ Fat shell with all chrome (limits team autonomy)  
❌ Login as MFE (bootstrap dependency issue)  
❌ Auth in each MFE (multiple refresh cycles)  
❌ Git submodules (painful sync)  
❌ Shared runtime state via MF singletons (version conflicts)  
❌ Duplicating auth code across shells

### Best Practices Applied:

✅ Thin shell (Chrome MFE pattern)  
✅ Shell as single auth source of truth  
✅ Namespaced global API (`window.__MFE_AUTH__`)  
✅ Versioned auth contract  
✅ HttpOnly cookies for refresh tokens  
✅ Memory-only access tokens  
✅ Auto-refresh at 80% lifetime  
✅ 401 auto-retry pattern  
✅ CODEOWNERS for shared MFE repo  
✅ Turborepo change detection  
✅ Environment-specific CDN paths  
✅ Wildcard cookies for SSO

---

## Implementation Phases

### Phase 0: Thin-Shell Refactor (in-progress)

- [x] `refactor-to-thin-shell` — vanilla shell bootstrap, slot-based mounting, manifest v2 (chrome+features), route guards
- [ ] `extract-auth-ui-package` — LoginPage / AuthProvider live in `@mfe-runtime/auth-ui`
- [ ] `mfe-lifecycle-contract` — MFEs export `bootstrap`/`mount`/`unmount`/`update`
- [ ] `navigation-bridge` — `window.__MFE_NAVIGATION__` global
- [ ] `chrome-mfe-header` — first chrome MFE
- [ ] `graceful-failure-boundaries` — slot-level failure UI, cache fallback, auth backoff

### Phase 1: Package Preparation

- [ ] Extract auth logic to `@mfe-runtime/auth` (no UI)
- [ ] Create `@mfe-runtime/auth-ui` with LoginPage component
- [ ] Enhance `@mfe-runtime/dynamic-loader` for slot-based mounting
- [ ] Publish packages to npm registry
- [ ] Document package APIs

### Phase 2: Chrome MFE Creation

- [ ] Create `mfe-header` (corporate header)
- [ ] Create `mfe-sidebar` (navigation)
- [ ] Create `mfe-footer` (corporate footer)
- [ ] Deploy chrome MFEs to CDN

### Phase 3: MFE Catalog Setup

- [ ] Create `mf-catalog` repo
- [ ] Migrate existing MFEs (mfe-widget)
- [ ] Set up CODEOWNERS per MFE
- [ ] Configure Turborepo change detection
- [ ] Set up CDN deployment pipeline

### Phase 4: Shell Repository Setup

- [ ] Create `customer-shell` repo
- [ ] Implement thin shell (~200 lines)
- [ ] Setup manifest generation per environment
- [ ] Configure K8s deployments (dev/sst/demo/prod)
- [ ] Test chrome MFE loading

### Phase 5: SSO & Testing

- [ ] Deploy to `.example.com` subdomains
- [ ] Configure wildcard cookies
- [ ] Test cross-shell navigation
- [ ] Verify token refresh across shells

### Phase 6: Documentation & Migration

- [ ] Migration guide from current monorepo
- [ ] Package usage examples
- [ ] Shell integration guide
- [ ] MFE development guide (chrome vs feature)
- [ ] Slot API documentation
