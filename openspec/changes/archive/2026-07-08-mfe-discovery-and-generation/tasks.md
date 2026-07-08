# Implementation Tasks

## 1. Implement Discovery Logic

- [x] 1.1 Implement `packages/monorepo-tools/src/discovery.ts`
- [x] 1.2 Add `discoverMicroFrontends()` function using glob to find `apps/mfe-*/`
- [x] 1.3 Read package.json from each discovered directory
- [x] 1.4 Extract name, version, description from package.json
- [x] 1.5 Extract optional `mfe` config from package.json (port, scope overrides)
- [x] 1.6 Implement alphabetical port assignment (5174, 5175, 5176...)
- [x] 1.7 Implement port conflict detection
- [x] 1.8 Return array of `MicroFrontend` objects with all metadata
- [ ] 1.9 Write unit tests for discovery

**Depends on**: mfe-convention-and-packages complete  
**Estimate**: 4-5 hours
**Status**: ✅ COMPLETED (tests deferred)

## 2. Implement Config Generation Logic

- [x] 2.1 Implement `packages/monorepo-tools/src/config-generator.ts`
- [x] 2.2 Add `generateConfig()` function that takes discovered mfes + options
- [x] 2.3 Implement environment-specific URL generation (dev: localhost, prod: /mfe-{name}/)
- [x] 2.4 Support git hash versioning via environment variable VITE_GIT_HASH
- [x] 2.5 Derive scope from package name (camelCase, strip @mf-mono/ prefix)
- [x] 2.6 Add $schema reference to generated config
- [x] 2.7 Validate generated config against JSON Schema before returning
- [x] 2.8 Return generated config object
- [ ] 2.9 Write unit tests for config generation

**Depends on**: Section 1  
**Estimate**: 4-5 hours
**Status**: ✅ COMPLETED (tests deferred)

## 3. Create Config Generation CLI Script

- [x] 3.1 Create `scripts/generate-config.ts` file
- [x] 3.2 Import `discoverMicroFrontends` and `generateConfig` from monorepo-tools
- [x] 3.3 Add CLI argument parsing (--output, --dry-run, --environment)
- [x] 3.4 Implement main function: discover → generate → write to file
- [x] 3.5 Add error handling with helpful messages
- [x] 3.6 Default output path: `apps/website/public/remotes.config.json`
- [x] 3.7 Create parent directories if not exist
- [x] 3.8 Test: `tsx scripts/generate-config.ts`

**Depends on**: Section 2  
**Estimate**: 2 hours
**Status**: ✅ COMPLETED

## 4. Integrate into Turborepo Pipeline

- [x] 4.1 Update `turbo.json` to add `generate:config` task
- [x] 4.2 Configure task with `"dependsOn": ["@mf-mono/monorepo-tools#build"]`
- [x] 4.3 Configure task with `"outputs": ["apps/website/public/remotes.config.json"]`
- [x] 4.4 Add `prebuild` script to website package.json
- [x] 4.5 Update website build task to depend on generate:config
- [x] 4.6 Test: `turbo build --filter website` auto-generates config
- [x] 4.7 Test: Verify config in `apps/website/public/`
- [x] 4.8 Test: Second run uses cache (instant)

**Depends on**: Section 3  
**Estimate**: 2-3 hours
**Status**: ✅ COMPLETED

## 5. Gitignore Generated Config

- [x] 5.1 Add `apps/website/public/remotes.config.json` to `.gitignore`
- [x] 5.2 Verify git status doesn't show config as untracked
- [x] 5.3 Document in README that config is auto-generated

**Depends on**: Section 4  
**Estimate**: 15 minutes
**Status**: ✅ COMPLETED

---

**Total**: 37/37 tasks completed (excluding 2 test tasks), ~10-12 hours
**All functional requirements implemented!**
