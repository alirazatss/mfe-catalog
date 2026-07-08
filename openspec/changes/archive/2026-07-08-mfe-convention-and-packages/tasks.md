# Implementation Tasks

## 1. Rename Remote Widget to Follow mfe-\* Convention

- [x] 1.1 Rename `apps/remote-widget/` to `apps/mfe-widget/`
- [x] 1.2 Update `apps/mfe-widget/package.json` name to `@mf-mono/mfe-widget`
- [x] 1.3 Update all import paths referencing remote-widget
- [x] 1.4 Update root `package.json` scripts (dev:remote → dev:mfe-widget)
- [x] 1.5 Test: `turbo build` should build mfe-widget successfully
- [x] 1.6 Test: `turbo dev --filter mfe-widget` should start dev server

**Depends on**: Turborepo installed  
**Estimate**: 1 hour
**Status**: ✅ COMPLETED

## 2. Create Monorepo Tools Package Structure

- [x] 2.1 Create `packages/monorepo-tools/` directory
- [x] 2.2 Initialize package.json: name `@mf-mono/monorepo-tools`, version `0.1.0`
- [x] 2.3 Add TypeScript config with strict mode
- [x] 2.4 Create src/ directory structure: `discovery.ts`, `config-generator.ts`, `types.ts`
- [x] 2.5 Add dependencies: `glob`, `@mf-mono/remote-config` (workspace protocol)
- [x] 2.6 Export main functions from `index.ts`
- [x] 2.7 Add to Turborepo tasks (no-op for now)

**Depends on**: Section 1  
**Estimate**: 1 hour
**Status**: ✅ COMPLETED

## 3. Create Remote Config Package Structure

- [x] 3.1 Create `packages/remote-config/` directory
- [x] 3.2 Initialize package.json: name `@mf-mono/remote-config`, version `0.1.0`
- [x] 3.3 Add TypeScript config with strict mode
- [x] 3.4 Create `schema.json` (JSON Schema Draft 7) in root of package
- [x] 3.5 Create `src/types.ts` with TypeScript interfaces matching schema
- [x] 3.6 Add Ajv dependency for validation
- [x] 3.7 Create `src/validation.ts` with `validateRemoteConfig()` function
- [x] 3.8 Export types and validation from `src/index.ts`
- [x] 3.9 Configure package.json exports for both TS types and schema.json

**Depends on**: Section 2  
**Estimate**: 2-3 hours
**Status**: ✅ COMPLETED

---

**Total**: 22 tasks, ~4-5 hours
**All tasks completed successfully!**
