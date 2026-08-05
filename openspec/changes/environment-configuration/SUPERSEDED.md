# SUPERSEDED: environment-configuration

**Superseded by**: `app-config-contract`  
**Date**: 2026-08-06  
**Reason**: Simplified approach with better type safety and validation

---

## What Carried Over

The **app-config-contract** change retained and improved upon the core config loading concepts:

### ✅ Type-Safe Configuration Contract

- **environment-configuration**: Proposed runtime config loading with TypeScript types
- **app-config-contract**: Delivers this with:
  - **Zod schema** as single source of truth (generates both TS types and JSON Schema)
  - **Runtime validation** with comprehensive error reporting
  - **JSON Schema artifact** for external validation

### ✅ Boot-Time Loading

- **environment-configuration**: Config fetched before app starts
- **app-config-contract**: Implements this with:
  - **Blocking load** in `main.ts` before `runtime.start()`
  - **Categorized errors** (fetch/parse/validation) with distinct UX
  - **Dev mode fallback** for resilience during development

### ✅ Public Config Document

- **environment-configuration**: Config served from `/public/config/`
- **app-config-contract**: Serves from `/app-config.json` with:
  - **Schema validation** (CI checks + runtime checks)
  - **Versioned schema** bundled into shell dist

---

## What Was Dropped

### ❌ Hostname-Based Environment Detection

**Original approach**:

```typescript
// Detect environment from hostname
const env = hostname.includes("staging")
  ? "staging"
  : hostname.includes("prod")
    ? "production"
    : "development";

// Load config.{env}.json
const config = await fetch(`/public/config/config.${env}.json`);
```

**Why dropped**:

1. **Deployment complexity**: Each environment needed pre-built config files in the bundle
2. **Version mismatch risk**: Shell version and config version could drift
3. **Customer-specific config**: Didn't address multi-tenant scenarios (each customer needing different config)
4. **Kubernetes mismatch**: In K8s, config comes from ConfigMaps/Secrets, not bundled files

**New approach** (app-config-contract):

- **Single config endpoint**: `/app-config.json` (environment-agnostic)
- **Deploy-time config**: Injected via build process or mounted at runtime (future: ConfigMap)
- **Schema validation**: CI checks + runtime validation ensure correctness
- **Customer-specific**: Each deployment gets its own config (via Helm values or similar)

### ❌ ConfigService Singleton

**Original approach**:

```typescript
export const ConfigService = {
  get: (key: string) => config[key],
  environment: () => detectedEnv,
  isProduction: () => detectedEnv === "production",
};
```

**Why dropped**:

1. **Shell runtime already manages config**: The `ShellRuntimeConfig` is the source of truth
2. **Less indirection**: Config passed directly to `createShellRuntime(config)`
3. **No global state**: Config is a parameter, not a singleton (better for testing)

**New approach** (app-config-contract):

- **Loaded once at boot**: `const { config } = await loadShellAppConfig()`
- **Passed to runtime**: `createShellRuntime(createWebsiteShellRuntimeConfig(config))`
- **Future**: Runtime config accepts `AppConfig` and uses it for auth endpoints, API URLs, etc.

### ❌ ConfigProvider React Context

**Original approach**:

```tsx
export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};
```

**Why dropped**:

1. **Not needed for vanilla shell**: The website shell is vanilla TypeScript (no React)
2. **MFEs get config via shared props**: `getSharedProps()` already passes context to MFEs
3. **No dynamic updates**: Config is static after boot (no hot reload requirement)

**New approach** (app-config-contract):

- **Boot-time load**: Config loaded before any React rendering
- **Shared props**: MFEs receive config via `getSharedProps()` (not implemented yet, but planned)
- **Type-safe access**: Config shape defined by Zod schema

---

## Migration Notes

If you were referencing the **environment-configuration** spec for planning:

1. **Use `app-config-contract` instead**: It delivers the core value (type-safe config loading) with simpler design
2. **Kubernetes validation deferred**: See `ROADMAP.md` section 2.3 for the future Kubernetes design
3. **No action needed for existing code**: This was a spec-only change; no implementation existed to migrate

---

## References

- **Superseding change**: `openspec/changes/app-config-contract/`
- **ROADMAP entry**: `ROADMAP.md` section 2.2 (updated to reference supersession)
- **Kubernetes design intent**: `ROADMAP.md` section 2.3 (deferred)
