## Context

MFEs currently expose React components via `exposes: { "./App": "./src/App.tsx" }`. The shell wraps those components in Suspense boundaries and renders them directly. This ties the shell to React and provides no hook for one-time initialization, cleanup, or prop updates without a full remount. As we adopt Chrome MFE and multi-shell architecture (ADR-0004, ADR-0007), we need a standardized lifecycle so:

- Chrome MFEs can be mounted once at bootstrap and persist across routes without remounting
- Feature MFEs can be swapped in `main-slot` without leaking React roots or event listeners
- The shell can push updates (theme change, user login/logout) without unmounting
- Loader validation can catch integration mistakes early with clear errors
- Future non-React MFEs are possible (though React is the only implementation today)

**Current implementation observed:**

- `apps/mfe-widget/vite.config.ts` exposes `./App` (React component) and `./CounterWidget` (framework-agnostic class)
- Shell code (`apps/website/src/App.tsx`) imports the widget via `React.lazy` and wraps in `Suspense`
- Cleanup on route change is handled implicitly by React unmount
- No shared prop shape — the widget accepts custom `basePath`, `router`, `isAuthenticated`, `user`

**Target implementation:**

- Every MFE exports `bootstrap`, `mount`, `unmount`, and optionally `update`
- Shell calls these lifecycle methods via `packages/dynamic-loader`
- Shared `MFEProps` interface defines context (user, theme, container, slot, basePath, onNavigate) that shell passes to every MFE
- Loader validates required exports and produces actionable errors on mismatches

**Stakeholders:**

- Platform team (owns `packages/dynamic-loader` and the sample MFE)
- MFE teams (must adopt the contract before their code loads under the new loader)
- Shell teams (rely on lifecycle for slot management and error handling)

**Constraints:**

- Do not break existing tests for `mfe-widget` (`App.tsx` React tree remains testable in isolation)
- React 19 `createRoot`/`Root#unmount` semantics must be respected
- `bootstrap` is called at most once per MFE per page load; `mount` may be called multiple times (for feature MFEs that leave/return); `unmount` must fully clean up
- Runtime cost of validation is negligible in production (validation runs once per remote load)
- Do not require Module Federation `shared: { singleton: true }` changes for this contract

## Goals / Non-Goals

**Goals:**

- Single `MFELifecycle` TypeScript interface exported from `@mfe-runtine/dynamic-loader`
- Single `MFEProps` interface capturing the shared prop surface
- Loader loads every MFE via the lifecycle contract, not raw React component import
- Reference implementation in `apps/mfe-widget/src/index.tsx` demonstrating a React MFE
- Loader validates lifecycle exports at load time and produces clear diagnostics
- Existing widget tests continue to pass (App component tested directly)
- Chrome MFEs get a stable API for persistent mounting

**Non-Goals:**

- Creating a Chrome MFE (deferred to `chrome-mfe-header` change)
- Introducing framework auto-detection or framework-specific adapters (only React is supported today)
- Adding lazy-loading strategies beyond what the loader already provides
- Introducing SSR support
- Migrating standalone MFEs (landing pages that run without a shell) — those keep their own bootstrap
- Publishing the loader to npm (still a `workspace:*` dep for now)

## Decisions

### Decision 1: Lifecycle interface named exports plus `default` object

MFEs export `bootstrap`, `mount`, `unmount`, and optionally `update` as top-level named exports AND as a `default` export bundling them. The loader accepts either form.

```typescript
// mfe-widget/src/index.tsx
export const bootstrap = async (props) => { ... };
export const mount = async (props) => { ... };
export const unmount = async (props) => { ... };
export default { bootstrap, mount, unmount };
```

**Rationale:**

- Named exports play well with Module Federation and tree-shaking
- Default export gives an ergonomic import (`import lifecycle from 'mfe-widget/lifecycle'`)
- Loader unifies both by reading named exports first, falling back to default

**Alternatives considered:**

- Default export only (rejected — harder to type across MF boundary)
- Named exports only (rejected — noisier for consumers who just want the object)

### Decision 2: Standard `MFEProps` shape defined in the loader package

All shared props flow through a single `MFEProps` interface exported by `@mfe-runtine/dynamic-loader`. Shells populate it from their bootstrap; MFEs consume the fields they need.

```typescript
interface MFEProps {
  container: HTMLElement;
  slot?: string;
  user?: User | null;
  isAuthenticated?: boolean;
  theme?: "light" | "dark";
  locale?: string;
  basePath?: string;
  config?: Record<string, unknown>;
  onNavigate?: (path: string) => void;
  [key: string]: unknown;
}
```

**Rationale:**

- Contract lives with the loader (its consumer)
- MFEs and shells import the same interface — no drift
- Optional fields let feature MFEs add custom props without breaking the contract

**Alternatives considered:**

- Loose `Record<string, unknown>` only (rejected — no compile-time safety for common fields)
- Split into `ChromeProps` vs `FeatureProps` (rejected — over-engineered for one field difference)

### Decision 3: Loader owns lifecycle bookkeeping

The loader tracks per-MFE state (`bootstrapped`, `mounted`) in a `Map`, ensures `bootstrap` runs at most once, and coordinates `mount`/`unmount`/`update` calls.

```typescript
class MFELoader {
  private instances = new Map<string, MFEInstance>();
  async load(name, slot, props) {
    /* bootstrap? → mount */
  }
  async unload(name) {
    /* unmount */
  }
  async update(name, partialProps) {
    /* update or unmount+mount */
  }
}
```

**Rationale:**

- Central lifecycle authority prevents each MFE from managing its own bootstrap flag
- Errors bubble to the shell for slot-level failure UI (integrates with `graceful-failure-boundaries` change)
- Enables loader to enforce "at most one MFE per slot" invariants

### Decision 4: Missing `update` falls back to unmount+mount

If an MFE does not export `update`, the loader implements it as `await lifecycle.unmount(props); await lifecycle.mount(newProps)`. Consumers do not need to detect the absence.

**Rationale:**

- Reduces boilerplate for simple MFEs
- Optional `update` becomes an optimization for MFEs that want to skip DOM teardown

### Decision 5: React 19 `createRoot` inside the wrapper, not the loader

MFE wrappers own React root creation/teardown. The loader never touches React. This keeps the loader framework-agnostic and lets each MFE choose its render strategy.

```typescript
// mfe-widget/src/index.tsx
let root: Root | null = null;

export const mount = async (props) => {
  root = createRoot(props.container);
  root.render(<StrictMode><App {...props} /></StrictMode>);
};

export const unmount = async () => {
  root?.unmount();
  root = null;
};
```

**Rationale:**

- Loader stays UI-framework-agnostic
- React root lifecycle is MFE's responsibility (matches Single-SPA React adapter pattern)
- Enables future non-React MFEs without loader changes

### Decision 6: Loader validation runs once per remote load

When `loader.load()` first pulls a remote's lifecycle module, it validates that `bootstrap`, `mount`, `unmount` are functions. If any are missing, the load fails with a diagnostic error identifying the MFE and missing exports. Validation results are cached — repeat mounts of the same MFE do not re-validate.

**Rationale:**

- Catch integration mistakes at load time, not at first mount attempt
- Cache avoids redundant checks in hot paths
- Actionable error messages ("MFE mfe-widget missing exports: mount, unmount") shorten debug cycles

## Risks / Trade-offs

- **[MFE authors miss the wrapper file]** → Provide a template + codemod in `packages/dynamic-loader/README.md`; the loader's validation error message links to the docs
- **[React root leaks across unmount]** → Wrapper tests must assert `root.unmount()` is called and the container is cleared; add a dev-mode leak detector (nice-to-have)
- **[Props change churn]** → `update` is optional; MFEs that don't implement it get an unmount+mount cycle, which may be visually jarring for chrome MFEs → chrome MFEs SHOULD implement `update`
- **[Lifecycle contract drift]** → Central `MFELifecycle` interface in `packages/dynamic-loader`; TS compile enforces the contract for wrappers that use the type
- **[Loader complexity]** → Bookkeeping adds ~100 lines to `DynamicLoader`; balanced by removing bespoke Suspense/React handling from the shell
- **[Test breakage]** → Existing `App.test.tsx` continues to pass because `App.tsx` still exists; add new tests for `index.tsx` wrapper

## Migration Plan

**Phase 1 — Contract & Loader (this change):**

1. Add `packages/dynamic-loader/src/lifecycle.ts` with `MFEProps`, `MFELifecycle`, validation helpers
2. Update `DynamicLoader.ts` to use the contract; keep backward compat via feature flag `LIFECYCLE_STRICT_MODE = false` for one release, warn on legacy MFEs
3. Add unit tests for lifecycle handling, missing-export errors, `update` fallback

**Phase 2 — Sample MFE:**

1. Add `apps/mfe-widget/src/index.tsx` implementing the lifecycle
2. Update `apps/mfe-widget/vite.config.ts` `exposes` map to include `./lifecycle` (keep `./App` for tests)
3. Update MFE tests to cover the wrapper
4. Update shell to load `./lifecycle` from the widget

**Phase 3 — Enforcement:**

1. Flip `LIFECYCLE_STRICT_MODE = true` — legacy MFEs (missing lifecycle exports) fail to load
2. Remove Suspense/React lazy wrappers from shell code once every MFE is migrated

**Rollback:**

- Revert the wrapper file and loader changes on the feature branch
- Legacy `./App` exports remain in place, so rollback is safe

## Open Questions

- Should the loader emit events (`mfe:bootstrap:start`, `mfe:mount:success`, `mfe:unmount:complete`) for observability? (Recommendation: yes — align with the future `graceful-failure-boundaries` change, which will consume these events for error tracking)
- Should the wrapper receive the shell's version of `React` via Module Federation `shared`? (Recommendation: yes for React and react-dom; already the case in current MFE config)
- How does the wrapper handle async data preloading in `bootstrap`? (Recommendation: `bootstrap` returns a promise; loader awaits it before calling `mount`)
- What does the loader do if `bootstrap` throws? (Recommendation: mark the MFE as failed, surface via slot error UI, do not attempt mount; retry policy is defined in `graceful-failure-boundaries` change)
