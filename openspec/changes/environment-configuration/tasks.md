## 1. Config Package Setup

- [ ] 1.1 Create `packages/config/` directory structure
- [ ] 1.2 Create `packages/config/package.json` with zero dependencies
- [ ] 1.3 Create `packages/config/tsconfig.json` extending base config
- [ ] 1.4 Add build script to package.json
- [ ] 1.5 Add `@mf-mono/config` to workspace in pnpm-workspace.yaml

**Depends on**: None (starting point)  
**Skill**: Backend developer or frontend developer  
**Estimate**: 30 minutes

---

## 2. Config Type Definitions

- [ ] 2.1 Create `packages/config/src/types.ts`
- [ ] 2.2 Define `Environment` type: 'development' | 'staging' | 'production'
- [ ] 2.3 Define `Config` interface with apiBaseUrl, auth, features
- [ ] 2.4 Define `AuthConfig` interface with loginUrl, logoutUrl, refreshUrl
- [ ] 2.5 Define `FeatureFlags` interface
- [ ] 2.6 Add JSDoc comments for all config properties

**Depends on**: Section 1 (package setup)  
**Skill**: Frontend developer  
**Estimate**: 1 hour

---

## 3. Environment Detection

- [ ] 3.1 Create `packages/config/src/detectEnvironment.ts`
- [ ] 3.2 Implement hostname-based detection (localhost = dev, staging.\* = staging)
- [ ] 3.3 Implement query parameter override (?env=production)
- [ ] 3.4 Add environment validation
- [ ] 3.5 Export `detectEnvironment()` function
- [ ] 3.6 Write unit tests for environment detection

**Depends on**: Section 2 (types defined)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 4. Config Loader

- [ ] 4.1 Create `packages/config/src/loadConfig.ts`
- [ ] 4.2 Implement async `loadConfig(environment)` function
- [ ] 4.3 Fetch `/config/config.{env}.json` using native fetch
- [ ] 4.4 Parse JSON response
- [ ] 4.5 Implement fallback to defaults on 404 or parse error
- [ ] 4.6 Add error logging for failed loads
- [ ] 4.7 Return merged config (defaults + loaded values)
- [ ] 4.8 Write unit tests with mocked fetch

**Depends on**: Section 3 (environment detection ready)  
**Skill**: Frontend developer  
**Estimate**: 2-3 hours

---

## 5. ConfigService Implementation

- [ ] 5.1 Create `packages/config/src/ConfigService.ts`
- [ ] 5.2 Implement singleton ConfigService class
- [ ] 5.3 Implement `initialize(config)` method
- [ ] 5.4 Implement `get(key)` method with type safety
- [ ] 5.5 Implement `getAll()` returning readonly config
- [ ] 5.6 Implement `getEnvironment()` returning current env
- [ ] 5.7 Implement `isDevelopment()` helper
- [ ] 5.8 Implement `onChange(callback)` for future hot reload
- [ ] 5.9 Export singleton instance: `export const configService = new ConfigService()`

**Depends on**: Sections 2 and 4 (types and loader ready)  
**Skill**: Frontend developer  
**Estimate**: 2-3 hours

---

## 6. Default Configuration

- [ ] 6.1 Create `packages/config/src/defaults.ts`
- [ ] 6.2 Define DEFAULT_CONFIG with development values
- [ ] 6.3 Set apiBaseUrl to 'http://localhost:3000/api'
- [ ] 6.4 Set auth URLs to /api/auth/\* endpoints
- [ ] 6.5 Set all feature flags to false
- [ ] 6.6 Export as const

**Depends on**: Section 2 (types defined)  
**Skill**: Frontend developer  
**Estimate**: 30 minutes

---

## 7. Package Exports

- [ ] 7.1 Create `packages/config/src/index.ts`
- [ ] 7.2 Export ConfigService class and configService singleton
- [ ] 7.3 Export Config, Environment types
- [ ] 7.4 Export loadConfig and detectEnvironment functions
- [ ] 7.5 Build package and verify exports work

**Depends on**: Sections 3, 4, 5, 6 (all implementations ready)  
**Skill**: Frontend developer  
**Estimate**: 30 minutes

---

## 8. Config Files

- [ ] 8.1 Create `apps/website/public/config/` directory
- [ ] 8.2 Create `config.dev.json` with development defaults
- [ ] 8.3 Set apiBaseUrl to 'http://localhost:3000/api'
- [ ] 8.4 Create `config.staging.json` placeholder (copy from dev)
- [ ] 8.5 Create `config.production.json` placeholder (update URLs to production)
- [ ] 8.6 Add .gitignore entry for config.\*.local.json (local overrides)

**Depends on**: None (can be parallel)  
**Skill**: Frontend developer or DevOps  
**Estimate**: 30 minutes

---

## 9. Shell Integration

- [ ] 9.1 Update `apps/website/src/main.tsx` to call loadConfig() before render
- [ ] 9.2 Await config load and initialize configService
- [ ] 9.3 Add loading screen component shown during config load
- [ ] 9.4 Remove loading screen after config ready
- [ ] 9.5 Test config loads successfully in development
- [ ] 9.6 Test app shows loading screen briefly then renders

**Depends on**: Sections 7 and 8 (package and config files ready)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 10. MFE Integration Example

- [ ] 10.1 Update `apps/mfe-widget/src/App.tsx` to accept optional config prop
- [ ] 10.2 Add ConfigProvider or use configService directly in widget
- [ ] 10.3 Update API client to use `configService.get('apiBaseUrl')`
- [ ] 10.4 Test widget can access config

**Depends on**: Section 9 (shell integration done)  
**Skill**: Frontend developer  
**Estimate**: 1 hour

---

## 11. Unit Tests

- [ ] 11.1 Write tests for detectEnvironment (localhost, staging, production)
- [ ] 11.2 Write tests for query param override
- [ ] 11.3 Write tests for loadConfig with mocked fetch (success, 404, invalid JSON)
- [ ] 11.4 Write tests for configService.get() and getAll()
- [ ] 11.5 Write tests for default config fallback
- [ ] 11.6 Write tests for type safety (use @ts-expect-error for invalid keys)

**Depends on**: Section 7 (package ready)  
**Skill**: Tester  
**Estimate**: 2-3 hours

---

## 12. Documentation

- [ ] 12.1 Create `packages/config/README.md`
- [ ] 12.2 Document Config interface and all properties
- [ ] 12.3 Document environment detection logic
- [ ] 12.4 Add examples of using configService in shell and MFEs
- [ ] 12.5 Document config file format and location
- [ ] 12.6 Add deployment guide (how to update config files per environment)
- [ ] 12.7 Document default values

**Depends on**: Section 10 (all features implemented)  
**Skill**: Technical writer or frontend developer  
**Estimate**: 2 hours

---

## 13. Integration Testing

- [ ] 13.1 Test config loads in development (localhost)
- [ ] 13.2 Test config loads from config.dev.json
- [ ] 13.3 Test fallback to defaults if config file missing
- [ ] 13.4 Test environment override with ?env=production
- [ ] 13.5 Test shell and MFE both access same config
- [ ] 13.6 Test API calls use config.apiBaseUrl

**Depends on**: Sections 9 and 10 (shell and MFE integration done)  
**Skill**: Tester  
**Estimate**: 2 hours

---

## Total Effort Estimate

- **Setup**: ~30 minutes
- **Type Definitions**: ~1 hour
- **Environment Detection**: ~1-2 hours
- **Config Loader**: ~2-3 hours
- **ConfigService**: ~2-3 hours
- **Defaults**: ~30 minutes
- **Exports**: ~30 minutes
- **Config Files**: ~30 minutes
- **Shell Integration**: ~1-2 hours
- **MFE Integration**: ~1 hour
- **Unit Tests**: ~2-3 hours
- **Documentation**: ~2 hours
- **Integration Tests**: ~2 hours

**Total**: ~16-20 hours (~2-3 days for 1 developer)
