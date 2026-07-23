## Context

`apps/website/src/main.ts` currently contains the complete Shell orchestration loop: Manifest acquisition, authentication bootstrap, Chrome mounting, Feature route activation, navigation listeners, and teardown decisions. Supporting modules mix reusable decisions with website policy. For example, route matching is generic but imports the repository token manager and renders website-specific access outcomes; MFE mounting supports the accepted lifecycle contract but also retains a React-specific compatibility path.

The repository already provides the lower-level pieces the runtime needs:

- `@mfe-runtine/remote-config` owns the Manifest shape and validation.
- `@mfe-runtine/dynamic-loader` resolves Manifest entries and Module Federation containers.
- ADR-0007 and the MFE lifecycle change define framework-owned `bootstrap`, `mount`, `unmount`, and optional `update` functions.
- ADR-0004, ADR-0005, and ADR-0006 establish thin Shells, two-layer routing, and Slot-level failure isolation.

The new package must coordinate these pieces without importing website modules, React, a particular authentication implementation, or a telemetry vendor. It targets browser orchestration, but importing it must remain safe in build tools and server-side module evaluation.

## Goals / Non-Goals

**Goals:**

- Move reusable Shell orchestration into a versioned `@mfe-runtine/shell-runtime` package.
- Keep deployable Shells responsible for policy, layout, branding, and rendered fallback UI.
- Provide explicit TypeScript contracts for Manifest, auth, navigation, Slot, failure, shared-prop, and observability boundaries.
- Make startup, navigation races, partial failures, restart, and disposal deterministic and testable.
- Reuse the existing Manifest, dynamic loader, and MFE lifecycle contracts.
- Migrate `apps/website` to prove that the runtime can support a real Shell.

**Non-Goals:**

- Rendering Shell UI or prescribing Slot markup and CSS.
- Mounting React components or importing any MFE framework runtime.
- Implementing token storage, login UI, role derivation, or a fixed redirect policy.
- Supporting server rendering, hydration, or non-browser lifecycle execution in v1.
- Replacing Module Federation, the dynamic loader, or the remote-config package.
- Publishing the package to an external registry as part of this change.

## Decisions

### 1. Use a configured runtime instance rather than global orchestration

The package will export a factory similar to:

```typescript
export interface ShellRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  getState(): ShellRuntimeState;
}

export function createShellRuntime(config: ShellRuntimeConfig): ShellRuntime;
```

Each instance owns its Dynamic Loader, lifecycle registry, Slot occupants, subscriptions, transition revision, and state. Construction validates static configuration but performs no I/O and touches no browser globals. `start` performs the browser check and begins orchestration.

This is preferred over a singleton because independent Shells, embedded tests, and multiple host regions need isolated state. It is preferred over automatic startup because explicit startup gives the Shell control over error handling and application readiness.

### 2. Define narrow adapters around Shell-owned policy

The stable configuration will use structural TypeScript contracts along these lines:

```typescript
interface ManifestProvider {
  load(): Promise<unknown>;
}

interface AuthAdapter<User = unknown> {
  initialize?(): Promise<void>;
  isAuthenticated(): boolean;
  getUser(): User | null;
  getRoles?(): readonly string[];
  subscribe?(listener: () => void): () => void;
}

interface NavigationAdapter {
  currentUrl(): URL;
  subscribe(listener: (url: URL) => void): () => void;
  navigate(to: string, options?: { replace?: boolean; state?: unknown }): void | Promise<void>;
}

type SlotResolver = (slot: string) => HTMLElement | null;

interface FailureRenderer {
  render(context: ShellRuntimeFailure): void | Promise<void>;
  clear(scope: FailureScope): void | Promise<void>;
}
```

`ShellRuntimeConfig` will also accept optional `getSharedProps` and `subscribeSharedProps` hooks. They carry theme, locale, and other Shell context without overloading authentication. Runtime-owned values such as `container`, `slot`, `basePath`, Manifest `config`, auth state, and `onNavigate` take precedence over conflicting custom keys.

The package will include two optional adapters: a configurable URL Manifest Provider and a browser History API Navigation Adapter. These are conveniences built against the same contracts, not privileged internal paths.

Direct imports from `@mfe-runtine/auth`, `@mfe-runtine/events`, React Router, or website rendering modules are rejected because they would make package upgrades dependent on one Shell's policy and framework choices.

### 3. Keep route policy data-driven and presentation-free

The runtime will use the existing Manifest route matcher and secure-by-default `requiresAuth` behavior. Authentication checks and required-role checks occur before remote loading. The Auth Adapter supplies provider-neutral state; it does not decide UI.

Route evaluation produces one of `allow`, `unauthenticated`, `forbidden`, or `not-found`. Non-allow outcomes are passed to the Failure Renderer with the attempted URL and route context. The website adapter may preserve its current behavior by navigating unauthenticated users to login and rendering its existing 403 or 404 views. Another Shell may show a modal or delegate to a host router without changing runtime code.

This is preferred over hardcoded login redirects because route destinations and login experiences vary by Shell. It is preferred over moving all guard evaluation into each Shell because the Manifest's auth semantics would otherwise be duplicated.

### 4. Introduce a framework-neutral lifecycle controller

For each resolved MFE, an internal lifecycle controller will request `./lifecycle`, normalize named or default lifecycle exports, and validate required functions. It will never request `./App` or create a framework root. The controller will construct the existing shared `MFEProps`, invoke `bootstrap` once per loaded MFE identity, and track mounted instances by Slot.

An MFE identity will include its Manifest name and resolved entry identity (entry URL and version when present). This prevents a changed remote at the same logical name from incorrectly inheriting bootstrapped state after a restart.

When shared props change, mounted MFEs with `update` receive updated props. For an MFE without `update`, the controller follows the accepted lifecycle contract by unmounting and mounting with new props. Cleanup attempts every active MFE even when one unmount rejects, and Slot bookkeeping is cleared in a finalization path.

This removes the website's temporary React compatibility branch and enforces ADR-0007 at the runtime boundary.

### 5. Model startup and teardown as an explicit state machine

The instance states will be `idle`, `starting`, `started`, `stopping`, `stopped`, `disposing`, and `disposed`.

- Concurrent `start` calls share one in-flight promise.
- `start` from `started` is a no-op and from `stopped` performs a fresh Manifest load and adapter snapshot.
- `stop` prevents new transitions, unsubscribes navigation/auth/shared-prop listeners, waits for or invalidates in-flight work, and unmounts all active MFEs.
- Concurrent `stop` calls share cleanup work.
- `dispose` includes `stop` semantics, releases owned references, and permanently rejects later startup.

Startup phases are Manifest load and validation, Dynamic Loader configuration, best-effort auth initialization, settled Chrome activation, current Feature activation, then subscription registration. Manifest failure is critical and rejects startup. Auth initialization failure is observable but degrades to unauthenticated state so public routes and independent Chrome can still run. Chrome activation uses all-settled behavior so one failed Slot does not block another.

An operation epoch changes when startup, stop, or disposal invalidates prior async work. Lifecycle completion checks the epoch before committing occupancy, preventing a late startup or mount from restoring state after teardown.

### 6. Serialize Feature transitions with latest-route-wins semantics

Navigation notifications update a monotonically increasing route revision and latest URL. One transition worker processes Feature changes at a time. Before committing each load or mount result, it compares its captured revision with the latest revision.

If work is stale before mount, it is discarded. If a lifecycle cannot be cancelled and completes mount after becoming stale, the controller immediately unmounts it and does not record it as active. The worker then evaluates the latest URL rather than replaying every intermediate URL. This provides deterministic convergence without requiring lifecycle functions to support cancellation.

Chrome MFEs do not participate in Feature transitions. Navigation within the same active Feature keeps it mounted and calls `update` when available so its internal router can respond without losing state.

This is preferred over queueing every URL because intermediate pages should not flash during rapid navigation. Rejecting navigation while busy is also rejected because it would make browser history and host routers diverge from rendered state.

### 7. Separate failure rendering from observation

`ShellRuntimeFailure` will be a discriminated union carrying the phase, severity, MFE and Slot identifiers when applicable, URL when applicable, and original cause. The Failure Renderer receives critical startup, route outcome, Slot resolution, loading, lifecycle, navigation, and cleanup contexts. A successful recovery calls `clear` for the affected scope.

Observers receive typed state, transition, lifecycle, failure, and recovery events. Observer hooks are optional and vendor-neutral. The runtime catches observer and renderer exceptions; observer failures cannot affect orchestration, and renderer failures are sent only to observers to prevent recursive rendering.

This two-channel design lets Shells own visible behavior while platform telemetry records the same runtime phases without coupling either concern to the other.

### 8. Keep the package internally modular but expose one primary entry point

The implementation will separate these responsibilities:

- `ShellRuntime`: public state machine and orchestration.
- `LifecycleController`: lifecycle resolution, validation, props, and Slot occupancy.
- `FeatureTransitionController`: route revision and latest-route convergence.
- `contracts`: public adapter, state, failure, event, and configuration types.
- `providers/url-manifest`: optional fetch/retry provider.
- `navigation/browser-history`: optional History API adapter.

The root entry point exports the factory, public contracts, and standard adapters. Internal controllers are not public API. The package will use ESM and the repository's `tsdown`/Vitest conventions, with no runtime UI-framework dependency.

### 9. Migrate the website through adapters, not runtime exceptions

`apps/website` will retain its fallback Manifest, auth bridge, login redirect, 403/404 rendering, critical error template, layout, and styles. A website runtime configuration module will adapt those concerns to the package contracts. `main.ts` will create and start the runtime, retaining only top-level fatal logging.

The website's `mfe-mount.ts` React fallback and local route orchestration will be removed after their lifecycle-only replacements are covered by integration tests. Existing navigation events may be adapted into the Navigation Adapter; they will not become a dependency of the runtime package.

## Risks / Trade-offs

- **[Adapter API churn]** Early consumers may expose missing use cases after release. → Keep contracts narrow, use structural typing, export only stable contracts, and prove them with the website migration before publication.
- **[Overlapping loader responsibilities]** Both runtime and Dynamic Loader could own Manifest and Slot state. → Keep remote resolution/caching in Dynamic Loader and orchestration/lifecycle occupancy in Shell Runtime; add tests at that boundary.
- **[Uncancellable lifecycle work]** A stale MFE may briefly mutate its container before cleanup. → Use route revisions, check before every commit, unmount stale completions immediately, and document that lifecycle functions must settle.
- **[Renderer failure hides user feedback]** Shell-provided fallback code can fail. → Isolate renderer exceptions, emit observer events, and continue unrelated Slots and transitions.
- **[Auth initialization degradation]** Treating initialization failure as unauthenticated may mask provider outages. → Emit a distinct auth initialization event/failure and prohibit protected MFE loading.
- **[Restarted Manifest changes]** A remote can change identity under the same name. → Key lifecycle bootstrap records by resolved remote identity rather than name alone.
- **[Lifecycle-only migration break]** Legacy component remotes cannot be mounted. → Verify every Manifest-referenced MFE exposes `./lifecycle` before switching the website; do not add a compatibility path to the stable package.

## Migration Plan

1. Add `packages/shell-runtime` with public contracts, state machine, standard providers, and focused unit tests.
2. Implement lifecycle-only mounting over `@mfe-runtine/dynamic-loader` and verify current Manifest-referenced MFEs expose `./lifecycle`.
3. Add website adapters for Manifest fallback, auth state/roles, navigation events, Slot lookup, shared props, and failure rendering.
4. Switch website bootstrap to `createShellRuntime` and run existing route, auth, deep-link, Chrome, and MFE interaction tests.
5. Remove superseded website orchestration and the React component fallback after parity is demonstrated.
6. Run workspace checks and tests, then document the package API and Shell integration example.

Rollback is limited to restoring the website's previous bootstrap imports and orchestration modules. The new package is additive until the website migration is validated, and this change does not publish an external package version.

## Open Questions

None. External package versioning and registry rollout will be decided when publication is requested; they do not affect the v1 runtime contract.
