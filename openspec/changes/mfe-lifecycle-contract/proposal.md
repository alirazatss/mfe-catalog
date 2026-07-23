## Why

Every MFE today exposes a raw React component (`./App`) via Module Federation. The shell mounts that component using React and unmounts it implicitly when routes change. This works for feature MFEs but breaks down for Chrome MFEs (which must persist across route changes), for MFEs that need one-time initialization (analytics, preloading), and for future non-React MFEs. Without a standardized lifecycle contract, the shell cannot reliably mount/unmount, pass shared props (user, theme, locale), or clean up subscriptions. ADR-0007 established that every MFE MUST export standardized lifecycle functions (`bootstrap`, `mount`, `unmount`, `update`) similar to the Single-SPA pattern.

## What Changes

- Introduce a formal MFE Lifecycle Contract in `packages/dynamic-loader/` defining `MFEProps` and `MFELifecycle` TypeScript interfaces
- Every MFE SHALL export `bootstrap`, `mount`, and `unmount` as top-level named exports (matching `MFELifecycle`); `update` remains optional
- **BREAKING**: MFE `vite.config.ts` files SHALL expose `./lifecycle` (pointing at `src/index.tsx`) instead of `./App`; consumers that still need the raw component can keep exposing `./App` as a secondary export
- Update `packages/dynamic-loader/` to load remotes via the lifecycle contract: call `bootstrap` once, `mount` on slot mount, `update` when props change, `unmount` on removal
- Extract shared prop shape (`user`, `isAuthenticated`, `theme`, `locale`, `basePath`, `container`, `slot`, `onNavigate`) into `MFEProps`, sourced from shell bootstrap
- Add loader-side validation that rejects MFEs missing required lifecycle exports with a clear diagnostic
- Update `apps/mfes/mfe-widget/src/index.tsx` (new file) to implement the contract, wrapping the existing `App.tsx` React tree
- Preserve React 19 `createRoot` semantics inside `mount`/`unmount` for React MFEs

## Capabilities

### New Capabilities

- `mfe-lifecycle-contract`: The standardized async lifecycle interface (`bootstrap`, `mount`, `unmount`, `update`) that every MFE implements and every shell consumes via the dynamic loader

### Modified Capabilities

- `dynamic-loader`: Loader now drives MFEs through the lifecycle instead of directly rendering React; also gains slot-target support and validation of MFE exports
- `module-federation-remote`: Remotes SHALL expose `./lifecycle` as the primary entry; `./App` becomes an optional secondary export for tooling/tests
- `microfrontend-sample`: The reference MFE (`mfe-widget`) demonstrates the full lifecycle implementation

## Impact

**Affected code:**

- New: `packages/dynamic-loader/src/lifecycle.ts` — TypeScript interfaces (`MFEProps`, `MFELifecycle`), validator, error types
- `packages/dynamic-loader/src/DynamicLoader.ts` — updated to call `bootstrap/mount/unmount/update`, track per-MFE lifecycle state, validate exports
- `packages/dynamic-loader/src/index.ts` — re-export lifecycle types for MFE authors
- New: `apps/mfes/mfe-widget/src/index.tsx` — lifecycle wrapper that owns the React root and renders `App.tsx`
- `apps/mfes/mfe-widget/vite.config.ts` — change `exposes` to point to `./lifecycle`; keep `./App` optionally for tests
- `apps/mfes/mfe-widget/src/App.tsx` — accepts full `MFEProps` (via props), still contains the internal React Router
- Existing MFE tests updated to import the wrapper for lifecycle assertions
- Shell (`apps/shells/website/src/main.ts` from `refactor-to-thin-shell`) — calls loader with slot target and expects lifecycle contract

**Affected dependencies:**

- No new npm dependencies
- Continues to rely on `react`, `react-dom`, Module Federation, and the existing `packages/dynamic-loader/` singleton

**Affected tests:**

- New unit tests in `packages/dynamic-loader/` for lifecycle validation, missing-export handling, `update` fallback (unmount + remount when `update` absent)
- New unit tests in `apps/mfes/mfe-widget/` for the lifecycle wrapper (bootstrap called once, mount/unmount clean up React root, update re-renders with new props)
- Existing MFE tests continue to pass; the React component remains testable in isolation

**Migration risk:**

- Any existing MFE not updated to the contract will fail to load once the loader enforces validation → publish a codemod or documented migration guide before flipping validation to error
- The shell integration relies on `refactor-to-thin-shell` being in place (loader slot targeting), so land these two changes together
- If React root management is done incorrectly, users could see duplicate roots or memory leaks — the wrapper tests must cover mount/unmount idempotency
