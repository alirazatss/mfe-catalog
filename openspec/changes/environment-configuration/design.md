## Context

Applications need different configuration for different environments (dev vs staging vs production). Currently, config is either hardcoded or uses build-time environment variables, which requires rebuilding for each environment. Runtime configuration allows the same build artifact to run in any environment by loading config at startup.

**Current State**:
- API URLs hardcoded or in .env files
- Must rebuild app for each environment
- No shared config between shell and MFEs

**Constraints**:
- Must load before app renders (blocking)
- Must be accessible in both shell and MFEs
- Should use native fetch (zero dependencies)
- Config files must be served as static assets

**Stakeholders**:
- Frontend developers needing environment-specific config
- DevOps team deploying to multiple environments

---

## Goals / Non-Goals

**Goals:**
- Load runtime config from JSON files
- Auto-detect environment from hostname
- Provide type-safe config access
- Share config between shell and MFEs
- Sensible defaults for development

**Non-Goals:**
- Server-side configuration management
- Dynamic config updates (hot reload can be added later)
- Encrypted configuration (add if needed)
- Remote config fetching from API (just static files)

---

## Decisions

### Decision 1: JSON Files in /public/config/

**Choice**: Store config files in `public/config/config.{env}.json` served as static assets.

**Rationale**:
- ✅ Works with any static file server
- ✅ Can be replaced on deployment without rebuild
- ✅ Simple to understand and maintain

**Pattern**:
```
public/
  config/
    config.dev.json
    config.staging.json
    config.production.json
```

**Alternatives Considered**:
- ❌ **Environment variables**: Build-time only, requires rebuild
- ❌ **Backend API endpoint**: Adds complexity, requires backend running

---

### Decision 2: Singleton ConfigService Pattern

**Choice**: Same pattern as `tokenManager` and `eventBus` - export singleton instance.

**Rationale**:
- ✅ Consistent architecture
- ✅ Single source of truth
- ✅ Works across Module Federation boundaries

---

### Decision 3: Hostname-Based Environment Detection

**Choice**: Detect environment from `window.location.hostname`.

**Rationale**:
- ✅ Automatic, no manual configuration needed
- ✅ Clear mapping: localhost = dev, staging.* = staging, production domain = production
- ✅ Can override with query param if needed

**Mapping**:
```typescript
if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
if (hostname.includes('staging')) return 'staging';
return 'production';
```

---

### Decision 4: Load Config Before App Renders

**Choice**: Block app rendering until config loads.

**Rationale**:
- ✅ Guarantees config available when components mount
- ✅ Prevents race conditions
- ✅ Simpler than lazy loading

**Trade-off**: Adds ~50-100ms to initial load (acceptable for config fetch).

---

### Decision 5: Fallback to Defaults on Load Failure

**Choice**: If config file 404 or invalid, use hardcoded defaults.

**Rationale**:
- ✅ App still works in dev even without config file
- ✅ Graceful degradation
- ✅ Easy local development setup

**Default Config**:
```typescript
const DEFAULT_CONFIG: Config = {
  apiBaseUrl: 'http://localhost:3000/api',
  auth: {
    loginUrl: '/api/auth/login',
    logoutUrl: '/api/auth/logout',
    refreshUrl: '/api/auth/refresh',
  },
  features: {
    darkMode: false,
  },
};
```

---

### Decision 6: Props vs Singleton for MFE Access

**Choice**: Support both - props from shell AND direct import of singleton.

**Rationale**:
- ✅ **Props**: Explicit dependency, easier to test
- ✅ **Singleton**: Convenient, no prop drilling
- ✅ Developers choose based on preference

---

## Risks / Trade-offs

### Risk 1: Config Load Blocks App Startup
**Risk**: Network delay fetching config slows initial render.  
**Mitigation**: 
- Config files are tiny (~1KB), load fast
- Cache config files with long cache time
- Show loading spinner during config load

### Risk 2: Wrong Config File Deployed
**Risk**: Production deploys with staging config.  
**Mitigation**:
- Deployment pipeline validates config file exists
- Add config environment validation at runtime
- Log current environment on startup

### Risk 3: Config Changes Require Page Reload
**Risk**: User must reload to see config updates.  
**Mitigation**:
- Accept for v1 (config rarely changes)
- Can add hot reload in v2 (service worker or polling)

---

## Migration Plan

### Phase 1: Create Config Package
1. Create `packages/config/` with ConfigService
2. Define Config TypeScript interface
3. Implement loadConfig() function
4. Write unit tests

### Phase 2: Create Config Files
1. Create `public/config/config.dev.json`
2. Add sensible development defaults
3. Create placeholder for staging/production

### Phase 3: Integrate in Shell
1. Update `apps/website/src/main.tsx` to load config before render
2. Initialize configService
3. Add loading state during config load
4. Test config loads correctly

### Phase 4: Use Config in API Clients
1. Update Axios instances to use `configService.get('apiBaseUrl')`
2. Remove hardcoded URLs
3. Test API calls work in different environments

### Phase 5: Documentation
1. Document config file format
2. Document environment detection logic
3. Add deployment guide for config files

---

## Open Questions

1. **Should we support config from <meta> tags?**
   - **Decision**: No, JSON files are simpler

2. **Should we validate config schema at runtime?**
   - **Decision**: Optional - log warnings for missing keys, but don't block

3. **Cache config files?**
   - **Decision**: Yes, use cache-busting with query param: `/config/config.dev.json?v=<build-hash>`
