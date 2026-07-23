# Implementation Tasks

## 1. Install Turborepo and Setup Base Configuration

- [x] 1.1 Install Turborepo: `pnpm add -Dw turbo`
- [x] 1.2 Create `turbo.json` with basic pipeline (build, dev, test tasks)
- [x] 1.3 Update root `package.json` scripts to use `turbo` commands
- [x] 1.4 Test Turborepo: `turbo build` should build both website and remote-widget
- [x] 1.5 Verify caching: run `turbo build` twice, second run should be instant (cached)
- [x] 1.6 Add `.turbo/` to `.gitignore`

**Depends on**: None  
**Owner**: Developer familiar with monorepo tooling  
**Estimate**: 1-2 hours
**Status**: ✅ COMPLETED

## 2. Rename Existing Remote to Follow Convention

- [ ] 2.1 Rename `apps/remote-widget/` to `apps/mfe-widget/`
- [ ] 2.2 Update `apps/mfe-widget/package.json` name to `@mfe-runtine/mfe-widget`
- [ ] 2.3 Update all import paths referencing remote-widget
- [ ] 2.4 Update root `package.json` scripts (dev:remote → dev:mfe-widget)
- [ ] 2.5 Test: `turbo build` should build mfe-widget successfully
- [ ] 2.6 Test: `turbo dev --filter mfe-widget` should start dev server

**Depends on**: Section 1 (Turborepo installed)  
**Owner**: Developer familiar with project structure  
**Estimate**: 1 hour

## 3. Create Monorepo Tools Package Structure

- [ ] 3.1 Create `packages/monorepo-tools/` directory
- [ ] 3.2 Initialize package.json: name `@mfe-runtine/monorepo-tools`, version `0.1.0`
- [ ] 3.3 Add TypeScript config with strict mode
- [ ] 3.4 Create src/ directory structure: `discovery.ts`, `config-generator.ts`, `types.ts`
- [ ] 3.5 Add dependencies: `glob`, `@mfe-runtine/remote-config` (workspace protocol)
- [ ] 3.6 Export main functions from `index.ts`
- [ ] 3.7 Add to Turborepo pipeline (no-op for now, will add tasks later)

**Depends on**: Section 2 (rename complete)  
**Owner**: Developer  
**Estimate**: 1 hour

## 4. Create Remote Config Package Structure

- [ ] 4.1 Create `packages/remote-config/` directory
- [ ] 4.2 Initialize package.json: name `@mfe-runtine/remote-config`, version `0.1.0`
- [ ] 4.3 Add TypeScript config with strict mode
- [ ] 4.4 Create `schema.json` (JSON Schema Draft 7) in root of package
- [ ] 4.5 Create `src/types.ts` with TypeScript interfaces matching schema
- [ ] 4.6 Add Ajv dependency for validation
- [ ] 4.7 Create `src/validation.ts` with `validateRemoteConfig()` function
- [ ] 4.8 Export types and validation from `src/index.ts`
- [ ] 4.9 Configure package.json exports for both TS types and schema.json

**Depends on**: Section 3 (packages structure ready)  
**Owner**: Developer familiar with JSON Schema  
**Estimate**: 2-3 hours

## 5. Implement Discovery Logic

- [ ] 5.1 Implement `packages/monorepo-tools/src/discovery.ts`
- [ ] 5.2 Add `discoverMicroFrontends()` function using glob to find `apps/mfe-*/`
- [ ] 5.3 Read package.json from each discovered directory
- [ ] 5.4 Extract name, version, description from package.json
- [ ] 5.5 Extract optional `mfe` config from package.json (port, scope overrides)
- [ ] 5.6 Implement alphabetical port assignment (5174, 5175, 5176...)
- [ ] 5.7 Implement port conflict detection
- [ ] 5.8 Return array of `MicroFrontend` objects with all metadata
- [ ] 5.9 Write unit tests for discovery (valid apps, missing package.json, port conflicts)

**Depends on**: Section 4 (types defined)  
**Owner**: Developer familiar with Node.js filesystem APIs  
**Estimate**: 4-5 hours

## 6. Implement Config Generation Logic

- [ ] 6.1 Implement `packages/monorepo-tools/src/config-generator.ts`
- [ ] 6.2 Add `generateConfig()` function that takes discovered mfes + options
- [ ] 6.3 Implement environment-specific URL generation (dev: localhost, prod: /mfe-{name}/)
- [ ] 6.4 Support git hash versioning via environment variable VITE_GIT_HASH
- [ ] 6.5 Derive scope from package name (camelCase, strip @mfe-runtine/ prefix)
- [ ] 6.6 Add $schema reference to generated config
- [ ] 6.7 Validate generated config against JSON Schema before returning
- [ ] 6.8 Return generated config object
- [ ] 6.9 Write unit tests for config generation (dev URLs, prod URLs, validation)

**Depends on**: Section 5 (discovery complete)  
**Owner**: Developer familiar with TypeScript  
**Estimate**: 4-5 hours

## 7. Create Config Generation CLI Script

- [ ] 7.1 Create `scripts/generate-config.ts` file
- [ ] 7.2 Import `discoverMicroFrontends` and `generateConfig` from monorepo-tools
- [ ] 7.3 Add CLI argument parsing (--output, --dry-run, --environment)
- [ ] 7.4 Implement main function: discover → generate → write to file
- [ ] 7.5 Add error handling with helpful messages
- [ ] 7.6 Default output path: `apps/website/public/remotes.config.json`
- [ ] 7.7 Create parent directories if not exist
- [ ] 7.8 Add execute permission and test: `tsx scripts/generate-config.ts`

**Depends on**: Section 6 (generation logic complete)  
**Owner**: Developer  
**Estimate**: 2 hours

## 8. Integrate Config Generation into Turborepo Pipeline

- [ ] 8.1 Update `turbo.json` to add `generate:config` task
- [ ] 8.2 Configure task with `"dependsOn": ["^build"]` (depends on all mfe builds)
- [ ] 8.3 Configure task with `"outputs": ["apps/website/public/remotes.config.json"]`
- [ ] 8.4 Add `prebuild` script to website package.json calling generate:config
- [ ] 8.5 Update website build task in turbo.json to depend on generate:config
- [ ] 8.6 Test: `turbo build --filter website` should auto-generate config
- [ ] 8.7 Test: Verify config appears in `apps/website/public/` directory
- [ ] 8.8 Test: Second run should use cache (instant)

**Depends on**: Section 7 (CLI script ready)  
**Owner**: Developer familiar with Turborepo  
**Estimate**: 2-3 hours

## 9. Gitignore Generated Config

- [ ] 9.1 Add `apps/website/public/remotes.config.json` to `.gitignore`
- [ ] 9.2 Verify git status doesn't show config as untracked after generation
- [ ] 9.3 Document in README that config is auto-generated (don't edit manually)

**Depends on**: Section 8 (config generation working)  
**Owner**: Developer  
**Estimate**: 15 minutes

## 10. Create Dynamic Loader Package Structure

- [ ] 10.1 Create `packages/dynamic-loader/` directory
- [ ] 10.2 Initialize package.json: name `@mfe-runtine/dynamic-loader`, version `0.1.0`
- [ ] 10.3 Add TypeScript config with strict mode
- [ ] 10.4 Add dependency: `@mfe-runtine/remote-config` (workspace protocol)
- [ ] 10.5 Create src/ structure: `DynamicLoader.ts`, `config.ts`, `events.ts`
- [ ] 10.6 Export DynamicLoader class from `index.ts`

**Depends on**: Section 4 (remote-config package ready)  
**Owner**: Developer  
**Estimate**: 1 hour

## 11. Implement Dynamic Loader - Config Fetching

- [ ] 11.1 Implement `packages/dynamic-loader/src/config.ts`
- [ ] 11.2 Add `fetchConfig()` function to load JSON from `/remotes.config.json`
- [ ] 11.3 Implement environment detection (NODE_ENV) for config file selection
- [ ] 11.4 Implement fallback chain: `.{env}.json` → `.json`
- [ ] 11.5 Add retry logic (2 retries with 1-second delay) for network failures
- [ ] 11.6 Integrate validation using `@mfe-runtine/remote-config` validateRemoteConfig
- [ ] 11.7 Cache validated config in memory
- [ ] 11.8 Write unit tests for config fetching (success, 404, network error, validation failure)

**Depends on**: Section 10 (loader package structure ready)  
**Owner**: Developer familiar with async/await  
**Estimate**: 3-4 hours

## 12. Implement Dynamic Loader - Event System

- [ ] 12.1 Implement `packages/dynamic-loader/src/events.ts`
- [ ] 12.2 Create EventEmitter wrapper or use simple pub/sub pattern
- [ ] 12.3 Define event types: config-load-start, config-load-success, remote-load-start, etc.
- [ ] 12.4 Export typed event emitter
- [ ] 12.5 Write unit tests for event emission

**Depends on**: Section 10 (loader structure ready)  
**Owner**: Developer  
**Estimate**: 1-2 hours

## 13. Implement Dynamic Loader - Core Loader Class

- [ ] 13.1 Implement `packages/dynamic-loader/src/DynamicLoader.ts`
- [ ] 13.2 Add `init()` method to fetch and cache config
- [ ] 13.3 Implement `loadRemote(name)` method with dynamic import
- [ ] 13.4 Add remote lookup in cached config by name
- [ ] 13.5 Check `enabled` flag and skip disabled remotes
- [ ] 13.6 Emit events throughout lifecycle (load-start, load-success, load-failed)
- [ ] 13.7 Handle scope mapping (config.scope vs config.name)
- [ ] 13.8 Implement fallback URLs iteration on load failure
- [ ] 13.9 Add `getStatus(name)`, `preload()`, `clearCache()` methods
- [ ] 13.10 Write unit tests for loader (20+ scenarios from spec)

**Depends on**: Section 11 (config fetching ready), Section 12 (events ready)  
**Owner**: Developer familiar with Module Federation dynamic imports  
**Estimate**: 6-8 hours

## 14. Integrate Dynamic Loader into Host Application

- [ ] 14.1 Update `apps/website/package.json` to add dependency: `@mfe-runtine/dynamic-loader`
- [ ] 14.2 Update `apps/website/src/config/remotes.ts` to import and use DynamicLoader
- [ ] 14.3 Initialize loader: `const loader = new DynamicLoader(); await loader.init();`
- [ ] 14.4 Update `apps/website/src/RemoteWidgetLoader.ts` to use `loader.loadRemote('mfe-widget')`
- [ ] 14.5 Replace hardcoded `import("remoteWidget/CounterWidget")` with dynamic loader
- [ ] 14.6 Keep static vite.config.ts remotes as fallback (commented, documented)
- [ ] 14.7 Add event listeners for logging (console.log on config/remote load events)
- [ ] 14.8 Test locally: verify config loads and mfe-widget loads via loader

**Depends on**: Section 13 (loader implementation complete)  
**Owner**: Developer familiar with host application code  
**Estimate**: 3-4 hours

## 15. Update Error Handling and Error Boundaries

- [ ] 15.1 Update host error boundary to show specific loader error messages
- [ ] 15.2 Add helpful message when config fails to load (with fallback info)
- [ ] 15.3 Add helpful message when remote not found in config
- [ ] 15.4 Add helpful message when remote is disabled
- [ ] 15.5 Log all loader events to console appropriately (log/warn/error)
- [ ] 15.6 Test error scenarios: delete config, invalid JSON, network offline, disabled remote

**Depends on**: Section 14 (loader integrated)  
**Owner**: Developer  
**Estimate**: 2-3 hours

## 16. Configure Turborepo Dev Mode

- [ ] 16.1 Update `turbo.json` dev task: `"cache": false, "persistent": true`
- [ ] 16.2 Update root `package.json` scripts:
  - `"dev": "turbo dev --filter website"`
  - `"dev:mfe": "turbo dev --filter 'mfe-*'"`
  - `"dev:all": "turbo dev"`
- [ ] 16.3 Test: `pnpm dev:all` starts all apps in parallel (host + all mfes)
- [ ] 16.4 Verify hot reload works for both host and mfe-widget
- [ ] 16.5 Verify both dev servers run simultaneously without port conflicts

**Depends on**: Section 14 (integration complete)  
**Owner**: Developer  
**Estimate**: 1-2 hours

## 17. Create Second Micro-Frontend for Testing

- [ ] 17.1 Create `apps/mfe-dashboard/` by copying mfe-widget structure
- [ ] 17.2 Update package.json: name `@mfe-runtine/mfe-dashboard`, version `1.0.0`
- [ ] 17.3 Implement simple dashboard component (different from counter)
- [ ] 17.4 Update vite.config.ts with Module Federation config (expose dashboard)
- [ ] 17.5 Run `turbo build` and verify both mfes discovered in generated config
- [ ] 17.6 Verify mfe-dashboard assigned port 5174, mfe-widget assigned 5175 (alphabetical)
- [ ] 17.7 Update host to conditionally load dashboard component
- [ ] 17.8 Test: both remotes load independently in host

**Depends on**: Section 16 (dev mode working)  
**Owner**: Developer  
**Estimate**: 2-3 hours

## 18. Test Turborepo Incremental Builds

- [ ] 18.1 Baseline: Run `turbo build` with everything unchanged (should be fully cached)
- [ ] 18.2 Test: Change mfe-widget code only, run `turbo build`
  - Verify only mfe-widget rebuilds
  - Verify mfe-dashboard served from cache
  - Verify config regenerated
  - Verify host rebuilds (config changed)
- [ ] 18.3 Test: Change mfe-dashboard code only, run `turbo build`
  - Verify only mfe-dashboard rebuilds
  - Verify mfe-widget served from cache
- [ ] 18.4 Test: Change host code only, run `turbo build`
  - Verify only host rebuilds
  - Verify both mfes served from cache
  - Verify config served from cache
- [ ] 18.5 Test: Run `turbo build --force` to rebuild everything (bypass cache)
- [ ] 18.6 Test: Run `turbo build --dry-run=json` to inspect execution plan

**Depends on**: Section 17 (multiple mfes ready)  
**Owner**: Developer familiar with Turborepo  
**Estimate**: 2 hours

## 19. Unit Tests - Monorepo Tools Package

- [ ] 19.1 Write tests for `discovery.ts` (10+ scenarios from spec)
  - Single mfe discovered
  - Multiple mfes discovered in alphabetical order
  - Non-matching directories ignored
  - Missing package.json skipped with warning
  - Invalid package.json skipped
  - Port assignment (alphabetical and custom)
  - Port conflict detection
- [ ] 19.2 Write tests for `config-generator.ts` (10+ scenarios)
  - Config generated for single/multiple mfes
  - Development URLs use localhost
  - Production URLs use deployed paths
  - Git hash versioning
  - Scope derivation from package name
  - Validation against schema
- [ ] 19.3 Achieve >80% code coverage for monorepo-tools package
- [ ] 19.4 Run: `turbo test --filter @mfe-runtine/monorepo-tools`

**Depends on**: Section 6 (generation logic complete)  
**Owner**: Developer familiar with testing frameworks  
**Estimate**: 4-5 hours

## 20. Unit Tests - Remote Config Package

- [ ] 20.1 Write tests for validation.ts (15+ scenarios from spec)
  - Valid config passes validation
  - Invalid JSON rejected
  - Missing required fields
  - Type mismatches
  - Duplicate remote names
  - Invalid URLs
- [ ] 20.2 Test type guard `isValidRemoteConfig()` with TypeScript narrowing
- [ ] 20.3 Achieve >80% code coverage
- [ ] 20.4 Run: `turbo test --filter @mfe-runtine/remote-config`

**Depends on**: Section 4 (remote-config package complete)  
**Owner**: Developer  
**Estimate**: 3-4 hours

## 21. Unit Tests - Dynamic Loader Package

- [ ] 21.1 Write tests for config fetching (10+ scenarios)
  - Config fetched successfully
  - Environment-specific config preferred
  - Fallback to default config
  - Retry logic on network errors
  - Validation integration
- [ ] 21.2 Write tests for remote loading (15+ scenarios from spec)
  - Remote loaded successfully
  - Remote not found in config
  - Disabled remote skipped
  - Fallback URLs used
  - Request deduplication
- [ ] 21.3 Write tests for event emission (all event types)
- [ ] 21.4 Achieve >80% code coverage
- [ ] 21.5 Run: `turbo test --filter @mfe-runtine/dynamic-loader`

**Depends on**: Section 13 (loader complete)  
**Owner**: Developer  
**Estimate**: 5-6 hours

## 22. Integration Tests

- [ ] 22.1 Create integration test: Full build workflow with Turborepo
  - Discover mfes
  - Generate config
  - Build all apps
  - Verify config in host dist/
- [ ] 22.2 Create integration test: Dev mode with multiple mfes
  - Start all dev servers
  - Verify each runs on correct port
- [ ] 22.3 Create integration test: Host loads remote via generated config
  - Start host and mfe dev servers
  - Load host in browser (automated via Playwright/Puppeteer)
  - Verify remote widget renders
- [ ] 22.4 Run integration tests in CI environment

**Depends on**: Section 17 (multiple mfes ready)  
**Owner**: Developer familiar with integration testing  
**Estimate**: 4-5 hours

## 23. Configure CI/CD with Turborepo

- [ ] 23.1 Create or update `.github/workflows/ci.yml` (or equivalent CI config)
- [ ] 23.2 Add Turborepo cache setup (GitHub Actions cache or Vercel Remote Cache)
- [ ] 23.3 Add step: Install dependencies (`pnpm install`)
- [ ] 23.4 Add step: Build changed apps (`turbo build --filter="[HEAD^1]"`)
- [ ] 23.5 Add step: Run tests (`turbo test`)
- [ ] 23.6 Add step: Lint/format (`turbo lint`)
- [ ] 23.7 Optional: Configure Vercel Remote Cache with `TURBO_TOKEN` secret
- [ ] 23.8 Test CI: Create PR with changes to single mfe, verify only that mfe builds
- [ ] 23.9 Measure build time improvement (compare before/after Turborepo)

**Depends on**: Section 18 (incremental builds verified)  
**Owner**: DevOps engineer or developer familiar with CI/CD  
**Estimate**: 3-4 hours

## 24. Documentation - README Updates

- [ ] 24.1 Update root `README.md` with "Monorepo Structure" section
- [ ] 24.2 Document `apps/mfe-*` naming convention
- [ ] 24.3 Document how to add new micro-frontend (create apps/mfe-{name}/)
- [ ] 24.4 Document Turborepo commands:
  - `turbo build` - Build all apps
  - `turbo dev` - Start all dev servers
  - `turbo build --filter="[HEAD^1]"` - Build only changed
- [ ] 24.5 Document port allocation strategy (alphabetical starting at 5174)
- [ ] 24.6 Add troubleshooting section for common issues
- [ ] 24.7 Document that remotes.config.json is auto-generated (don't edit)

**Depends on**: Section 17 (multiple mfes working)  
**Owner**: Technical writer or developer  
**Estimate**: 2-3 hours

## 25. Documentation - Deployment Guide

- [ ] 25.1 Update `docs/PRODUCTION_DEPLOYMENT.md` with Turborepo deployment
- [ ] 25.2 Document build process: `turbo build` generates config automatically
- [ ] 25.3 Document deployment structure:
  - `/` - Host application
  - `/mfe-widget/` - Widget micro-frontend
  - `/mfe-dashboard/` - Dashboard micro-frontend
- [ ] 25.4 Document environment variable usage (NODE_ENV, VITE_GIT_HASH)
- [ ] 25.5 Document production URL patterns with versioning
- [ ] 25.6 Add example CI/CD pipeline for production deployment
- [ ] 25.7 Document Turborepo remote cache setup (optional but recommended)

**Depends on**: Section 23 (CI/CD configured)  
**Owner**: Technical writer or DevOps engineer  
**Estimate**: 2-3 hours

## 26. Documentation - Developer Workflow Guide

- [ ] 26.1 Create `docs/DEVELOPER_WORKFLOW.md`
- [ ] 26.2 Document: "Adding a New Micro-Frontend" step-by-step
- [ ] 26.3 Document: "Development Mode" (running dev servers)
- [ ] 26.4 Document: "Building and Testing" with Turborepo
- [ ] 26.5 Document: "Understanding the Config Generation" (how it works)
- [ ] 26.6 Document: "Debugging Turborepo Cache" (--dry-run, --force, cache clearing)
- [ ] 26.7 Add example micro-frontend template or generator script

**Depends on**: Section 24 (README complete)  
**Owner**: Technical writer or developer  
**Estimate**: 2-3 hours

## 27. Create Example Micro-Frontend Template

- [ ] 27.1 Create `templates/mfe-template/` directory (outside apps/)
- [ ] 27.2 Add template package.json with placeholders for name
- [ ] 27.3 Add template vite.config.ts with Module Federation setup
- [ ] 27.4 Add template src/ structure with example component
- [ ] 27.5 Create generator script: `scripts/create-mfe.ts`
- [ ] 27.6 Script prompts for name, copies template to `apps/mfe-{name}/`
- [ ] 27.7 Script replaces placeholders in package.json
- [ ] 27.8 Test: Run script to create new mfe, verify it works end-to-end

**Depends on**: Section 26 (workflow documented)  
**Owner**: Developer  
**Estimate**: 3-4 hours

## 28. Performance Testing and Optimization

- [ ] 28.1 Measure baseline: Full build time without Turborepo caching
- [ ] 28.2 Measure: Full build time with Turborepo (first run, cache cold)
- [ ] 28.3 Measure: Full build time with Turborepo (second run, cache warm)
- [ ] 28.4 Measure: Incremental build time (1 mfe changed)
- [ ] 28.5 Document cache hit rates in different scenarios
- [ ] 28.6 Optimize Turborepo outputs configuration if needed
- [ ] 28.7 Consider adding remote cache for CI if build times high

**Depends on**: Section 23 (CI/CD configured)  
**Owner**: Developer or performance engineer  
**Estimate**: 2-3 hours

## 29. Final Manual QA

- [ ] 29.1 Test: Clone fresh repository, run `pnpm install && turbo build`
- [ ] 29.2 Verify: Config auto-generated during build
- [ ] 29.3 Test: `pnpm dev:all` starts all apps in parallel
- [ ] 29.4 Test: Create new mfe using template, verify auto-discovery
- [ ] 29.5 Test: Change one mfe code, verify only that mfe rebuilds
- [ ] 29.6 Test: Delete config file, verify host falls back to static config
- [ ] 29.7 Test: Production build with git hash versioning
- [ ] 29.8 Test: Error scenarios (disabled remote, remote not found, network offline)
- [ ] 29.9 Test: Cache clearing and force rebuild (`turbo build --force`)
- [ ] 29.10 Test: Turborepo in CI (create PR, verify selective builds)

**Depends on**: Section 28 (performance tested)  
**Owner**: QA engineer or developer  
**Estimate**: 3-4 hours

## 30. Finalization and Release Preparation

- [ ] 30.1 Run `vp check` (format, lint, type check) on all packages
- [ ] 30.2 Run full test suite: `turbo test`
- [ ] 30.3 Run full build: `turbo build`
- [ ] 30.4 Review all documentation for completeness
- [ ] 30.5 Create changelog documenting new features
- [ ] 30.6 Tag packages with initial version (0.1.0) if publishing to npm
- [ ] 30.7 Verify no TODOs or placeholder content remain
- [ ] 30.8 Create migration guide for existing projects
- [ ] 30.9 Get code review from team
- [ ] 30.10 Merge to main branch after approval

**Depends on**: Section 29 (QA complete)  
**Owner**: Team lead or senior developer  
**Estimate**: 2-3 hours

---

## Summary

**Total Tasks**: 178 checkboxes across 30 sections  
**Total Estimated Effort**: 85-105 hours  
**Estimated Timeline**:

- **1 developer**: 3-4 weeks
- **2 developers**: 2-2.5 weeks (with parallel work)

**Critical Path**:
Sections 1→2→3→4→5→6→7→8→14 (core functionality: Turborepo + discovery + generation + integration)

**Parallel Work Opportunities**:

- Sections 10-13 (dynamic loader) can be developed in parallel with sections 5-8 (discovery/generation)
- Sections 19-21 (unit tests) can start as soon as corresponding implementation sections complete
- Sections 24-27 (documentation) can be done in parallel with testing sections
- Section 17 (second mfe) can be done anytime after section 14

**Key Milestones**:

- **Week 1**: Turborepo setup + discovery + generation working
- **Week 2**: Dynamic loader integrated + multiple mfes
- **Week 3**: Testing complete + CI/CD configured
- **Week 4**: Documentation + final QA + release
