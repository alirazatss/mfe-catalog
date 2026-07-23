## Context

We have successfully implemented:

- **Phase 0-2**: Auto-discovery, config generation, and Turborepo integration
- **Phase 3**: Runtime dynamic loader (`@mfe-runtine/dynamic-loader`)

**Current state**: The host application (`apps/shells/website`) uses hardcoded Module Federation imports:

```typescript
// Hardcoded import
const CounterWidget = lazy(() => import("remoteWidget/CounterWidget"));
```

The Vite config also has hardcoded remotes:

```typescript
remotes: {
  remoteWidget: "http://localhost:5174/remoteEntry.js";
}
```

**Target state**: The host dynamically loads remotes at runtime using the generated `remotes.config.json` and the dynamic loader.

**Constraints**:

- Must maintain backward compatibility during transition
- Should preserve hot module reloading in development
- Must handle network failures gracefully
- Should provide clear error messages to developers

**Stakeholders**:

- Frontend developers consuming micro-frontends
- DevOps managing deployments
- End users experiencing the UI

## Goals / Non-Goals

**Goals:**

- Replace hardcoded imports with dynamic loader API
- Initialize loader at app startup and handle config fetch
- Provide loading states and error boundaries for remotes
- Add event-based logging for debugging
- Maintain static config as documented fallback
- Ensure hot reload continues to work in development

**Non-Goals:**

- React hooks for easier integration (defer to future enhancement)
- Server-side rendering support (future)
- Advanced error recovery strategies (future)
- Remote module caching beyond loader's built-in cache (future)
- A/B testing or feature flagging UI (future)

## Decisions

### Decision 1: Initialize Loader at App Startup

**Choice**: Initialize the dynamic loader in a top-level module that runs before the app renders.

**Rationale**:

- Config fetch happens once at startup
- All remote loads can assume loader is initialized
- Errors during config fetch can be caught at root level
- Simplifies error handling (no "loader not initialized" edge cases)

**Alternatives considered**:

- ❌ **Lazy initialization on first remote load**: More complex error handling, race conditions
- ✅ **Eager initialization at startup**: Simple, predictable, easier to debug

**Implementation**:

```typescript
// apps/shells/website/src/config/remotes.ts
import { loader } from "@mfe-runtine/dynamic-loader";

export async function initializeRemotes() {
  try {
    await loader.init();
    console.log("Remote config loaded successfully");
  } catch (error) {
    console.error("Failed to load remote config:", error);
    // App can still run with fallback behavior
  }
}

export { loader };
```

---

### Decision 2: Use Loader API Directly (No React Hooks Yet)

**Choice**: Call `loader.loadRemote()` directly in components without custom React hooks.

**Rationale**:

- Keeps Phase 4 scope minimal
- React Suspense already handles async loading
- Custom hooks can be added later without breaking changes
- Easier to test and reason about

**Alternatives considered**:

- ❌ **Create `useRemote()` hook now**: Increases scope, delays delivery
- ✅ **Direct API calls**: Simple, functional, easy to enhance later

**Implementation**:

```typescript
// apps/shells/website/src/RemoteWidgetLoader.tsx
import { loader } from "./config/remotes";

const CounterWidget = lazy(async () => {
  const container = await loader.loadRemote("mfe-widget");
  const module = await container.get("./CounterWidget");
  return module();
});
```

---

### Decision 3: Preserve Static Config as Fallback

**Choice**: Keep existing static `vite.config.ts` remotes configuration (commented/documented).

**Rationale**:

- Safety net if dynamic loader fails
- Documents the expected structure
- Easier rollback if issues arise
- Useful reference for developers

**Alternatives considered**:

- ❌ **Remove static config entirely**: Risky, no fallback
- ❌ **Dual mode (static + dynamic)**: Complex, confusing
- ✅ **Keep static config documented**: Safe, clear

**Implementation**:

```typescript
// vite.config.ts
federation({
  name: "host",
  remotes: {
    // Static fallback (used if dynamic loader disabled)
    // remoteWidget: "http://localhost:5174/remoteEntry.js"
  },
  // ...
});
```

---

### Decision 4: Event Logging for Development

**Choice**: Add console logging for all loader events during development.

**Rationale**:

- Helps developers debug remote loading issues
- Provides visibility into what's happening
- No production overhead (can be conditionally disabled)
- Uses existing loader event system

**Alternatives considered**:

- ❌ **No logging**: Hard to debug
- ❌ **Custom logger**: Over-engineering
- ✅ **Console logging with NODE_ENV check**: Simple, effective

**Implementation**:

```typescript
// apps/shells/website/src/config/remotes.ts
if (import.meta.env.DEV) {
  loader.on("config:fetch:success", ({ config }) => {
    console.log("Remotes config loaded:", config);
  });

  loader.on("remote:load:success", ({ name }) => {
    console.log(`Remote '${name}' loaded successfully`);
  });

  loader.on("remote:load:error", ({ name, error }) => {
    console.error(`Failed to load remote '${name}':`, error);
  });
}
```

---

### Decision 5: Update Remote Name from "remoteWidget" to "mfe-widget"

**Choice**: Rename remote references to match the `mfe-*` naming convention.

**Rationale**:

- Consistency with auto-discovery convention
- Matches package name `@mfe-runtine/mfe-widget`
- Aligns with generated config structure
- Easier to understand what's a micro-frontend

**Alternatives considered**:

- ❌ **Keep "remoteWidget" name**: Inconsistent with convention
- ✅ **Rename to "mfe-widget"**: Consistent, clear

**Breaking change**: Yes, but scoped to this monorepo only.

**Migration**: Update all `import("remoteWidget/...")` to use loader API with `"mfe-widget"`.

---

### Decision 6: Error Boundary Enhancements

**Choice**: Update error boundary to detect and display specific loader error messages.

**Rationale**:

- Better developer experience (clear error messages)
- Easier debugging (know exactly what failed)
- User-friendly fallback UI
- No additional dependencies needed

**Alternatives considered**:

- ❌ **Generic error messages**: Unhelpful for debugging
- ✅ **Specific error messages**: Clear, actionable

**Error types to handle**:

1. Config fetch failed → "Failed to load remote configuration"
2. Remote not found → "Remote '{name}' not found in config"
3. Remote disabled → "Remote '{name}' is currently disabled"
4. Script load failed → "Failed to load remote '{name}' from {url}"

---

## Risks / Trade-offs

### Risk 1: Config Fetch Failure at Startup

**Impact**: If config fetch fails, no remotes can be loaded dynamically.

**Mitigation**:

- Loader already implements retry logic (2 retries with backoff)
- Static config can be uncommented as fallback
- Error boundary shows clear message to user
- Developer sees console error with details

---

### Risk 2: Breaking Changes from Renaming

**Impact**: Changing "remoteWidget" to "mfe-widget" breaks existing imports.

**Mitigation**:

- All changes are in a single monorepo (easy to update)
- Update happens in one PR
- No external consumers to break
- Can be tested before deployment

---

### Risk 3: Hot Module Reload Issues

**Impact**: Dynamic loading might interfere with HMR in development.

**Mitigation**:

- Test HMR thoroughly during integration testing
- Vite's HMR should still work with dynamic imports
- Document any HMR limitations discovered
- Fallback: reload page if HMR breaks

---

### Risk 4: Increased Initial Load Time

**Impact**: Config fetch adds ~100-300ms to startup time.

**Mitigation**:

- Config is small (~1-5KB), fetches quickly
- Cached after first fetch
- Can be preloaded during app shell render
- Acceptable trade-off for dynamic loading capability

---

### Risk 5: Error Handling Complexity

**Impact**: More error paths to handle (config fetch, remote load, script load).

**Mitigation**:

- Loader handles most error cases internally
- Error boundary catches React-level errors
- Clear error messages guide developers
- Event logging aids debugging

---

## Migration Plan

**Deployment**: Single deployment after all changes are complete.

**Steps**:

1. Add `@mfe-runtine/dynamic-loader` dependency
2. Update remote initialization code
3. Update remote loading code
4. Update error boundaries
5. Test all scenarios (success, failures)
6. Deploy to development first
7. Monitor logs and errors
8. Deploy to production

**Rollback**: Uncomment static config in `vite.config.ts`, redeploy.

**Validation**:

- Integration tests verify remotes load correctly
- Error scenarios tested manually
- HMR tested in development
- Network failure scenarios tested

---

## Open Questions

1. **Should we add a loading spinner for config fetch?**
   - **Status**: Deferred to future enhancement
   - **Decision**: App shell can show loading state if needed

2. **Should we add retry UI for failed remote loads?**
   - **Status**: Out of scope for Phase 4
   - **Decision**: Error boundary shows error, user can refresh page

3. **Should we validate remote versions match expected versions?**
   - **Status**: Future enhancement
   - **Decision**: MVP trusts generated config

4. **Should we add telemetry/analytics for remote load performance?**
   - **Status**: Future enhancement
   - **Decision**: Console logging sufficient for MVP
