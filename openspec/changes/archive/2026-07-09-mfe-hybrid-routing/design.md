## Context

**Current State:**

- Host application loads MFEs as isolated components (no routing)
- `mfe-widget` renders in a div container via `RemoteWidgetLoader`
- No URL-based navigation or deep linking
- No way for MFEs to have multiple pages/views
- Dynamic loader fetches remotes on demand, but no routing layer

**Constraints:**

- Must work with existing dynamic loader architecture
- Must support both simple MFEs (no routing) and complex MFEs (with routing)
- Must allow MFEs to run standalone for development
- Must maintain Module Federation sharing and lazy loading benefits
- Must not require MFEs to use specific router library (framework-agnostic shell)

**Stakeholders:**

- Frontend developers building MFEs (need routing autonomy)
- Host application maintainers (need centralized navigation)
- End users (need deep linking, back button support, SEO)

## Goals / Non-Goals

**Goals:**

- ✅ Shell owns top-level routes (`/products`, `/checkout`, `/analytics`)
- ✅ MFEs own sub-routes (`/products/:id`, `/checkout/cart`)
- ✅ MFEs receive `basePath` prop to make routes portable
- ✅ Lazy load MFEs only when their route is accessed
- ✅ Support MFEs without routing (simple widgets)
- ✅ Enable standalone MFE development (`basePath="/"`)
- ✅ Cross-MFE navigation works via shell router
- ✅ Route guards for authentication/authorization
- ✅ SEO-friendly URLs and meta tags

**Non-Goals:**

- ❌ Server-side rendering (SSR) - future enhancement
- ❌ React-specific routing in MFEs - MFEs can use any router
- ❌ Shared layout components - each MFE owns its layout
- ❌ Route-level code splitting beyond MFE boundaries
- ❌ Query parameter sync across MFEs (too complex for v1)

## Decisions

### Decision 1: React Router in Shell, Any Router in MFEs

**Choice:** Use React Router (`react-router-dom@6`) in shell, allow MFEs to use any router (or none).

**Rationale:**

- React Router v6 has data APIs (`loader`, `action`) for future server patterns
- Shell is React-based, so React Router is natural fit
- MFEs can use different frameworks (Vue Router, Angular Router, or none)
- Decouples shell routing from MFE routing implementation

**Alternatives Considered:**

- **Framework-agnostic router** (e.g., Navigo, page.js) - Less ecosystem support, no data APIs
- **Require all MFEs to use React Router** - Couples MFE framework choice, breaks autonomy

**Decision:** React Router in shell, MFEs are free to choose.

---

### Decision 2: BasePath Contract via Props

**Choice:** Shell passes `basePath` prop to MFE root component.

**Rationale:**

- MFE routes become portable (can run at any path)
- MFE can run standalone with `basePath="/"`
- Simple contract: `<MFEProducts basePath="/products" />`
- Works regardless of MFE's internal router

**Alternatives Considered:**

- **Environment variable** (`VITE_BASE_PATH`) - Requires rebuild for different paths, not runtime-flexible
- **Global window variable** (`window.__MFE_BASE_PATH__`) - Pollutes global scope, fragile
- **URL parsing inside MFE** - Tight coupling, MFE must know shell URL structure

**Decision:** Props are explicit, type-safe, and runtime-flexible.

---

### Decision 3: Wildcard Routes for MFE Namespaces

**Choice:** Shell routes use wildcards: `/products/*` → MFE-Products

**Rationale:**

- MFE owns all routes under `/products/*`
- Shell doesn't need to know MFE's internal routes
- Easy to add new sub-routes in MFE without shell changes

**Implementation:**

```tsx
// Shell router
{
  path: "/products/*",
  element: <MFEProductsWrapper />,
  loader: () => loader.loadRemote("mfe-products"),
}
```

**Alternatives Considered:**

- **Explicit sub-routes in shell** (`/products/:id`, `/products/new`) - Shell knows too much, violates encapsulation
- **Query parameters** (`/mfe?name=products&route=list`) - Ugly URLs, bad SEO, no browser history

**Decision:** Wildcard routes with basePath contract.

---

### Decision 4: Lazy Loading via React Router + Dynamic Loader

**Choice:** Combine React Router's `lazy()` with dynamic loader.

**Rationale:**

- Leverages React Router's built-in Suspense support
- Dynamic loader already fetches remotes on demand
- Natural integration point: route → load remote → render MFE

**Implementation:**

```tsx
import { lazy } from "react";
import { loader as mfeLoader } from "./config/remotes";

const MFEProducts = lazy(() =>
  mfeLoader
    .loadRemote("mfe-products")
    .then((container) => container.get("./App"))
    .then((factory) => ({ default: factory().ProductsApp })),
);
```

**Alternatives Considered:**

- **Preload all MFEs at startup** - Slower initial load, wastes bandwidth for unused MFEs
- **Custom loading component** - Duplicates React Router's Suspense, more code

**Decision:** Use React's `lazy()` + dynamic loader for automatic code splitting.

---

### Decision 5: Cross-MFE Navigation via Custom Events

**Choice:** MFEs emit navigation events, shell listens and routes.

**Rationale:**

- Decouples MFEs from shell router implementation
- MFE doesn't import shell's router (no coupling)
- Works even if MFE uses different framework

**Implementation:**

```tsx
// MFE emits navigation event
window.dispatchEvent(
  new CustomEvent("mfe:navigate", {
    detail: { path: "/checkout/cart" },
  }),
);

// Shell listens and routes
useEffect(() => {
  const handler = (e: CustomEvent) => router.navigate(e.detail.path);
  window.addEventListener("mfe:navigate", handler);
  return () => window.removeEventListener("mfe:navigate", handler);
}, []);
```

**Alternatives Considered:**

- **Shared router instance** - Couples MFE to shell's React Router, breaks autonomy
- **Callback props** (`onNavigate={(path) => ...}`) - Verbose, must thread through every component
- **URL-based messaging** (`window.location.hash`) - Fragile, pollutes URL

**Decision:** Custom events are framework-agnostic and loosely coupled.

---

### Decision 6: Route Guards in Shell

**Choice:** Authentication and authorization checks happen at shell route level.

**Rationale:**

- Centralized security - one place to audit
- Guards run before MFE loads (faster rejection)
- MFEs don't need to duplicate auth logic

**Implementation:**

```tsx
{
  path: "/admin/*",
  element: <MFEAdmin />,
  loader: async () => {
    if (!isAuthenticated()) throw redirect("/login");
    if (!hasRole("admin")) throw new Response("Forbidden", { status: 403 });
    return loader.loadRemote("mfe-admin");
  },
}
```

**Alternatives Considered:**

- **Guards in MFEs** - Duplicated logic, inconsistent enforcement, MFE loads before rejection
- **Middleware at API level only** - No UI protection, poor UX (user sees UI then gets rejected)

**Decision:** Shell guards + API middleware (defense in depth).

---

### Decision 7: MFE Standalone Mode via Environment Variable

**Choice:** MFEs detect standalone mode via `import.meta.env.MODE`.

**Rationale:**

- `vp dev` in MFE sets `MODE=development`
- MFE can conditionally set `basePath="/"` in standalone mode
- No code changes needed to toggle standalone vs. integrated

**Implementation:**

```tsx
// MFE entry point
const basePath = import.meta.env.MODE === "standalone" ? "/" : "/products";

<BrowserRouter>
  <Routes>
    <Route path={`${basePath}/*`} element={<ProductsApp />} />
  </Routes>
</BrowserRouter>;
```

**Alternatives Considered:**

- **Separate entry file** (`main-standalone.ts`) - Duplicates code, harder to maintain
- **Build flag** (`STANDALONE=true pnpm build`) - Requires separate builds

**Decision:** Runtime detection via environment variable.

---

## Risks / Trade-offs

### Risk 1: Multiple Router Instances

**Risk:** Shell has React Router, MFE also has React Router → two routers managing history.

**Mitigation:**

- Use `MemoryRouter` in MFEs when integrated (shell manages history)
- Use `BrowserRouter` in MFEs only when standalone
- Pass `router` prop to MFE: `<MFEProducts router="memory" basePath="/products" />`

**Trade-off:** MFEs must support both router types (minor config change).

---

### Risk 2: Deep Link to MFE Sub-Route Before MFE Loads

**Risk:** User visits `/products/123` directly, but MFE-Products isn't loaded yet.

**Mitigation:**

- Shell's loader function loads MFE before rendering route
- React Router waits for loader to resolve
- Suspense boundary shows loading state

**Trade-off:** Slightly slower initial page load for deep links (acceptable).

---

### Risk 3: MFE Navigation Events Lost if Shell Not Listening

**Risk:** MFE emits `mfe:navigate` event before shell's listener is registered.

**Mitigation:**

- Shell registers listener in root `<App>` (before MFEs render)
- MFEs emit events after user interaction (not on mount)

**Trade-off:** Assumes shell is mounted before MFEs (always true in our architecture).

---

### Risk 4: basePath Prop Not Passed to MFE

**Risk:** Developer forgets to pass `basePath`, MFE routes break.

**Mitigation:**

- TypeScript types require `basePath` prop
- MFE defaults to `basePath="/"` with console warning in dev mode
- Documentation and examples show proper usage

**Trade-off:** Relies on TypeScript (acceptable for this monorepo).

---

### Risk 5: SEO for Client-Side Routed MFEs

**Risk:** Search engines may not index client-side routes properly.

**Mitigation:**

- Add meta tags in shell for top-level routes (`/products`, `/checkout`)
- Use React Helmet or similar for dynamic meta tags in MFEs
- Future: Add SSR (non-goal for v1, but architecture supports it)

**Trade-off:** SEO not perfect in v1, but sufficient for authenticated apps. Public apps should add SSR in future.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shell (Host App)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React Router (BrowserRouter)                              │ │
│  │                                                             │ │
│  │  /                    → <HomePage />                       │ │
│  │  /auth/login          → <LoginPage />                      │ │
│  │  /products/*          → <MFEProductsWrapper />             │ │
│  │  /checkout/*          → <MFECheckoutWrapper />             │ │
│  │  /analytics/*         → <MFEAnalyticsWrapper />            │ │
│  │                                                             │ │
│  │  Route Guards: Authentication, Authorization               │ │
│  │  Event Listener: mfe:navigate → router.navigate()          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  MFE-Products (Lazy Loaded)                                │ │
│  │                                                             │ │
│  │  <ProductsApp basePath="/products" router="memory" />      │ │
│  │                                                             │ │
│  │  Internal Routes (MemoryRouter):                           │ │
│  │    /products/              → <ProductList />               │ │
│  │    /products/:id           → <ProductDetail />             │ │
│  │    /products/:id/edit      → <ProductEdit />               │ │
│  │    /products/new           → <ProductCreate />             │ │
│  │                                                             │ │
│  │  Cross-MFE Navigation:                                     │ │
│  │    emits: mfe:navigate { path: "/checkout/cart" }          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Dynamic Loader Integration                                │ │
│  │                                                             │ │
│  │  Route Loader Function:                                    │ │
│  │    1. Check authentication/authorization                   │ │
│  │    2. Call loader.loadRemote("mfe-products")               │ │
│  │    3. Get module container                                 │ │
│  │    4. Return MFE component                                 │ │
│  │    5. React Router renders with Suspense boundary          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              MFE-Products (Standalone Mode)                      │
│                                                                   │
│  <BrowserRouter>                                                 │
│    <ProductsApp basePath="/" router="browser" />                │
│  </BrowserRouter>                                                │
│                                                                   │
│  Internal Routes:                                                │
│    /              → <ProductList />                             │
│    /:id           → <ProductDetail />                           │
│    /:id/edit      → <ProductEdit />                             │
│    /new           → <ProductCreate />                           │
│                                                                   │
│  No cross-MFE navigation (standalone doesn't have shell)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: User Navigates to /products/123

```
1. User types /products/123 in browser
   ↓
2. React Router matches route: /products/*
   ↓
3. Route loader runs:
   - Check authentication (guard)
   - loader.loadRemote("mfe-products")
   ↓
4. Dynamic Loader:
   - Fetch remotes.config.json (if not cached)
   - Find "mfe-products" entry
   - Inject script tag for remoteEntry.js
   - Initialize Module Federation container
   ↓
5. Get MFE module:
   - container.get("./App")
   - factory() returns { ProductsApp }
   ↓
6. React Router renders:
   - <Suspense fallback={<LoadingSpinner />}>
   -   <MFEProductsWrapper basePath="/products" />
   - </Suspense>
   ↓
7. MFE-Products renders:
   - <MemoryRouter initialEntries={["/products/123"]}>
   -   <Routes>
   -     <Route path="/products/:id" element={<ProductDetail />} />
   -   </Routes>
   - </MemoryRouter>
   ↓
8. ProductDetail renders with id=123
```

---

## Migration Plan

### Phase 1: Add Routing to Shell (No MFE Changes)

1. Install `react-router-dom` in host
2. Create route configuration with single route for mfe-widget
3. Update `main.ts` to use `<RouterProvider>`
4. Test: mfe-widget loads at `/widget` route

**Rollback:** Remove router, revert to direct rendering (no breaking changes)

### Phase 2: Update MFE-Widget to Accept basePath

1. Add `basePath` prop to CounterWidget
2. Update internal links to use basePath (if any)
3. Test standalone mode with `basePath="/"`

**Rollback:** Default `basePath="/"` maintains backward compatibility

### Phase 3: Add Cross-MFE Navigation (Event System)

1. Create navigation event utilities
2. Add event listener in shell router
3. Document usage for MFE developers

**Rollback:** Events are opt-in, no breaking changes

### Phase 4: Add Route Guards

1. Create auth guard utilities
2. Add guards to protected routes
3. Test unauthorized access

**Rollback:** Remove guards, routes become public again

---

## Open Questions

1. **Should we create a shared `@mf-mono/routing-utils` package?**
   - Utilities for: `navigateTo()`, `useMFERouter()`, route config types
   - Pro: Reduces duplication across MFEs
   - Con: Adds dependency coupling
   - **Decision needed before implementation**

2. **How should MFEs handle 404 routes?**
   - Option A: MFE shows 404 within its boundary
   - Option B: MFE emits event, shell shows global 404
   - **Recommendation:** Option A for faster UX, Option B for consistency

3. **Should route configuration be auto-generated like remotes.config.json?**
   - Discover `apps/mfe-*/routes.json` → generate shell route config
   - Pro: Zero-config routing like zero-config discovery
   - Con: Implicit routing, harder to debug
   - **Recommendation:** Manual route config for v1, auto-generation in future

4. **How to handle route transitions/animations?**
   - Shell-level transitions (consistent across MFEs)
   - MFE-level transitions (each MFE controls its own)
   - **Recommendation:** MFE-level for autonomy, shell can add page-level fade

5. **Should we use React Router's data APIs (`loader`, `action`)?**
   - Pro: Server-pattern ready, better error handling
   - Con: Couples MFE to React Router patterns
   - **Recommendation:** Use in shell, optional in MFEs
