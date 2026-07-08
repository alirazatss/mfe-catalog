## Context

Currently, the micro-frontend host uses hardcoded Module Federation imports to load remotes. With Phase 2 complete, we now have:

- Auto-discovery of micro-frontends from filesystem
- Generated `remotes.config.json` with environment-specific URLs
- JSON Schema validation for config structure

**Current state**: Host application has hardcoded imports like `import("remoteWidget/App")` with static `remoteEntry.js` URLs.

**Target state**: Host fetches `remotes.config.json` at runtime and dynamically loads remotes based on the config, respecting enabled flags and using fallback URLs.

**Constraints**:

- Must work in browser (no Node.js APIs)
- Must be framework-agnostic (core loader doesn't depend on React)
- Must integrate with existing Module Federation v2 setup
- Must support Webpack's `__webpack_init_sharing__` and `__webpack_share_scopes__` APIs

**Stakeholders**:

- Frontend developers using the loader to consume micro-frontends
- Platform team maintaining the monorepo infrastructure
- DevOps managing deployments and CDN configuration

## Goals / Non-Goals

**Goals:**

- Create runtime loader that fetches and validates generated config
- Support dynamic loading of Module Federation remotes by name
- Implement retry logic for config fetching (network resilience)
- Emit lifecycle events for telemetry and debugging
- Support enabled/disabled flag for feature toggles
- Support fallback URL chains for CDN failover
- Cache config in memory to avoid repeated fetches
- Provide preloading API for performance optimization

**Non-Goals:**

- React integration layer (deferred to Phase 4)
- Server-side rendering support (future enhancement)
- Custom event filtering or complex pub/sub (keep simple)
- Automatic version conflict resolution (developer handles via config)
- Polyfills for older browsers (assume modern ESM support)

## Decisions

### Decision 1: Framework-Agnostic Core Package

**Choice**: Implement core loader without React or any UI framework dependencies.

**Rationale**:

- Enables use in non-React micro-frontends (Vue, Svelte, etc.)
- Separates concerns: loader logic vs. React integration
- Makes testing simpler (no need to mock React)
- Follows single responsibility principle

**Alternatives considered**:

- ❌ **React-first with hooks in same package**: Would lock loader to React, harder to reuse
- ✅ **Framework-agnostic core + separate React package**: Enables flexibility, defer React layer to Phase 4

---

### Decision 2: Singleton Loader Instance

**Choice**: Export a single global DynamicLoader instance instead of allowing multiple instances.

**Rationale**:

- Prevents duplicate config fetches (network efficiency)
- Ensures consistent state across application
- Simplifies API (no need to pass loader around)
- Matches Module Federation's global scope model

**Alternatives considered**:

- ❌ **Allow multiple instances**: Adds complexity, no clear benefit for MFE use case
- ✅ **Singleton pattern**: Simple, efficient, sufficient for runtime config loading

**Implementation**:

```typescript
// index.ts
export const loader = new DynamicLoader();
export default loader;
```

---

### Decision 3: Memory-Only Config Caching

**Choice**: Cache validated config in memory, no localStorage or sessionStorage persistence.

**Rationale**:

- Config is small (<10KB typically), fast to fetch
- Avoids stale cache issues (config regenerates on every build)
- Simpler implementation (no cache invalidation logic)
- Reduces security risk (no persistent storage of CDN URLs)

**Alternatives considered**:

- ❌ **localStorage caching**: Risk of stale config, adds complexity
- ✅ **Memory-only**: Simple, always fresh on page load

---

### Decision 4: Event System for Telemetry

**Choice**: Implement simple EventEmitter-style API for lifecycle events.

**Rationale**:

- Enables telemetry without coupling to specific analytics library
- Useful for debugging in development
- Allows host app to track loading performance
- Lightweight (no external dependencies)

**Events to emit**:

- `config:fetch:start` → Config fetch initiated
- `config:fetch:success` → Config loaded and validated
- `config:fetch:error` → Config fetch or validation failed
- `remote:load:start` → Remote loading initiated
- `remote:load:success` → Remote loaded and initialized
- `remote:load:error` → Remote loading failed

**Alternatives considered**:

- ❌ **No events, just promises**: Harder to track lifecycle, no telemetry hook
- ✅ **EventEmitter pattern**: Standard, flexible, debuggable

---

### Decision 5: Retry Logic for Config Fetching

**Choice**: Implement exponential backoff retry (2 attempts: 1s, 2s delays).

**Rationale**:

- Handles transient network failures gracefully
- Improves resilience in CDN/proxy environments
- Simple implementation (no external retry library needed)

**Configuration**:

- Max retries: 2 (total 3 attempts)
- Delay: exponential backoff (1s, 2s)
- Non-configurable for MVP (keep simple)

**Alternatives considered**:

- ❌ **No retries**: Poor user experience on network hiccups
- ❌ **Infinite retries**: Could hang application indefinitely
- ✅ **Fixed retry count with backoff**: Balanced approach

---

### Decision 6: Fallback URL Chain Support

**Choice**: Support array of `entryUrl` strings in config, try each in order until success.

**Rationale**:

- Enables CDN failover (primary CDN → backup CDN → localhost)
- Supports A/B testing of CDN providers
- Aligns with production deployment best practices

**Config schema extension** (optional enhancement for future):

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": [
        "https://cdn.example.com/mfe-widget/v123/remoteEntry.js",
        "https://backup-cdn.example.com/mfe-widget/v123/remoteEntry.js",
        "http://localhost:5174/remoteEntry.js"
      ]
    }
  ]
}
```

**For MVP**: Support single `entryUrl` string, design API to accept arrays later.

**Alternatives considered**:

- ❌ **Single URL only**: No failover capability
- ✅ **Array support (future)**: Enables resilience, defer to avoid scope creep

---

### Decision 7: Module Federation Integration via Dynamic Script Loading

**Choice**: Use `<script>` tag injection + `__webpack_init_sharing__` API.

**Rationale**:

- Standard Module Federation approach
- Works with Webpack Module Federation Plugin v2
- Browser-native script loading (no custom loader logic)
- Supports scope isolation via `__webpack_share_scopes__`

**Implementation pattern**:

```typescript
async loadRemote(name: string) {
  const remote = this.config.remotes.find(r => r.name === name);
  if (!remote.enabled) throw new Error("Remote disabled");

  // Inject script tag
  await this.loadScript(remote.entryUrl);

  // Initialize sharing
  await __webpack_init_sharing__('default');
  const container = window[remote.scope];
  await container.init(__webpack_share_scopes__.default);

  // Load module
  const factory = await container.get('./App');
  return factory();
}
```

**Alternatives considered**:

- ❌ **Native ESM import()**: Doesn't support Module Federation scope isolation
- ✅ **Script tag + Webpack API**: Standard MFE pattern, well-documented

---

## Risks / Trade-offs

### Risk 1: Config Fetch Failure at Startup

**Impact**: Application can't load any micro-frontends, broken user experience.

**Mitigation**:

- Implement retry logic (2 retries with backoff)
- Emit error events for monitoring
- Provide `getStatus()` method to check loader health
- Document fallback strategy in host integration guide

---

### Risk 2: Module Federation Version Conflicts

**Impact**: Shared dependencies (React, etc.) version mismatches cause runtime errors.

**Mitigation**:

- Document required `shared` configuration in README
- Use Webpack Module Federation's singleton: true for critical libs
- Add version checking in future enhancement
- Out of scope for Phase 3 (developer responsibility)

---

### Risk 3: Network Latency on Initial Load

**Impact**: User sees loading spinner while config fetches.

**Mitigation**:

- Provide `preload()` method to fetch config during app initialization
- Cache config in memory after first fetch
- Document performance best practices (preload during splash screen)
- Consider HTTP/2 push for config file (deployment optimization, future)

---

### Risk 4: CORS Issues with CDN URLs

**Impact**: Config fetch or remote script loading blocked by CORS policy.

**Mitigation**:

- Document required CORS headers for CDN setup
- Provide error messages that mention CORS explicitly
- Test with real CDN in staging environment
- Out of scope for loader package (deployment concern)

---

### Risk 5: Breaking Changes in Module Federation API

**Impact**: Webpack updates could break `__webpack_init_sharing__` contract.

**Mitigation**:

- Pin Webpack and Module Federation plugin versions in package.json
- Monitor Webpack changelog for breaking changes
- Abstract Webpack APIs behind loader interface (future refactor)
- Document supported Webpack versions in README

---

## Migration Plan

**Deployment**: Not applicable (Phase 3 creates package only, no host integration yet).

**Rollback**: Not applicable (no runtime changes).

**Validation**:

- Unit tests for config fetching (20+ scenarios)
- Unit tests for event system (5+ scenarios)
- Unit tests for loader class (25+ scenarios)
- Manual testing with generated config from Phase 2

**Next phase**: Phase 4 will integrate loader into host application.

---

## Open Questions

1. **Should we support config hot-reloading in development?**
   - **Status**: Deferred to future enhancement
   - **Decision**: MVP uses single fetch at app startup, reload page to refresh config

2. **Should loader validate remote scope names against Webpack config?**
   - **Status**: Out of scope
   - **Decision**: Developer ensures scope names match between config and Webpack setup

3. **Should we expose low-level Module Federation APIs (init, get)?**
   - **Status**: MVP exposes high-level `loadRemote(name)` only
   - **Decision**: Keep API simple, add advanced APIs if needed later

4. **Should we support loading specific module paths (e.g., `mfe-widget/Button`)?**
   - **Status**: Deferred to Phase 4 (React integration)
   - **Decision**: MVP loads default export only, extend API later if needed
