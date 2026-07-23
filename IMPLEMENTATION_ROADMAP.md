# Micro-Frontend Implementation Roadmap

This document outlines the phased implementation plan for the dynamic micro-frontend system, split into manageable chunks.

## ✅ Phase 0: Turborepo Setup (COMPLETED)

**Status**: ✅ Implemented  
**Change**: `dynamic-microfrontend-registry` (archived/partial)  
**Time**: 1-2 hours

**What was completed**:

- ✅ Installed Turborepo (`pnpm add -Dw turbo`)
- ✅ Created `turbo.json` with tasks configuration
- ✅ Updated root `package.json` scripts
- ✅ Tested Turborepo build (works!)
- ✅ Verified caching (7ms FULL TURBO!)
- ✅ Added `.turbo/` to `.gitignore`

**Verification**:

```bash
pnpm turbo build  # Should use cache, complete in <100ms
```

---

## 📦 Phase 1: Convention and Package Structure

**Status**: ⏳ Not started  
**Change**: `mfe-convention-and-packages`  
**Time**: 4-5 hours  
**Tasks**: 22 tasks across 3 sections

**What you'll implement**:

1. Rename `apps/mfes/remote-widget/` → `apps/mfes/mfe-widget/`
2. Create `packages/monorepo-tools/` package skeleton
3. Create `packages/remote-config/` package skeleton with JSON Schema

**Start here**:

```bash
cd /Users/ali.raza/dev/mfe-runtine
cat openspec/changes/mfe-convention-and-packages/tasks.md
```

**Verification**:

```bash
turbo build  # Should build apps/mfes/mfe-widget successfully
ls packages/  # Should see monorepo-tools/ and remote-config/
```

---

## 🔍 Phase 2: Discovery and Config Generation

**Status**: ⏳ Not started  
**Change**: `mfe-discovery-and-generation`  
**Time**: 13-15 hours  
**Tasks**: 44 tasks across 5 sections  
**Depends on**: Phase 1 complete

**What you'll implement**:

1. Discovery logic (`packages/monorepo-tools/src/discovery.ts`)
2. Config generation (`packages/monorepo-tools/src/config-generator.ts`)
3. CLI script (`scripts/generate-config.ts`)
4. Turborepo integration (auto-generate config on build)
5. Gitignore generated config

**Start here**:

```bash
cat openspec/changes/mfe-discovery-and-generation/tasks.md
```

**Verification**:

```bash
tsx scripts/generate-config.ts  # Should generate remotes.config.json
turbo build --filter website  # Should auto-generate config
cat apps/shells/website/public/remotes.config.json  # Should see mfe-widget
```

---

## 🔌 Phase 3: Dynamic Loader

**Status**: ⏳ Not started  
**Change**: `mfe-dynamic-loader`  
**Time**: 11-15 hours  
**Tasks**: 29 tasks across 4 sections  
**Depends on**: Phase 1 complete (Phase 2 optional but recommended)

**What you'll implement**:

1. Dynamic loader package structure
2. Config fetching logic (from `/remotes.config.json`)
3. Event system for telemetry
4. Core DynamicLoader class with `loadRemote()` method

**Start here**:

```bash
cat openspec/changes/mfe-dynamic-loader/tasks.md
```

**Verification**:

```bash
# In browser console or Node test:
import { DynamicLoader } from '@mfe-runtine/dynamic-loader';
const loader = new DynamicLoader();
await loader.init();
const module = await loader.loadRemote('mfe-widget');
```

---

## 🏠 Phase 4: Host Integration

**Status**: ⏳ Not started  
**Change**: `mfe-host-integration`  
**Time**: 6-9 hours  
**Tasks**: 22 tasks across 6 sections  
**Depends on**: Phases 1, 2, and 3 complete

**What you'll implement**:

1. Add dynamic-loader dependency to host
2. Initialize loader in host
3. Replace hardcoded imports with `loader.loadRemote()`
4. Update error boundaries
5. Maintain static config fallback
6. Integration testing

**Start here**:

```bash
cat openspec/changes/mfe-host-integration/tasks.md
```

**Verification**:

```bash
pnpm dev:all  # Start all apps
# Open http://localhost:5173
# mfe-widget should load dynamically via generated config
```

---

## 📊 Implementation Progress

| Phase     | Change Name            | Status  | Tasks     | Time       | Dependencies |
| --------- | ---------------------- | ------- | --------- | ---------- | ------------ |
| 0         | Turborepo Setup        | ✅ Done | 6/6       | 1-2h       | None         |
| 1         | Convention & Packages  | ⏳ Todo | 0/22      | 4-5h       | Phase 0      |
| 2         | Discovery & Generation | ⏳ Todo | 0/44      | 13-15h     | Phase 1      |
| 3         | Dynamic Loader         | ⏳ Todo | 0/29      | 11-15h     | Phase 1      |
| 4         | Host Integration       | ⏳ Todo | 0/22      | 6-9h       | Phases 1-3   |
| **Total** |                        |         | **6/123** | **35-46h** |              |

**Critical Path**: Phase 0 → 1 → 2 → 3 → 4

---

## 🚀 Recommended Implementation Order

### Option A: Sequential (Safest)

1. ✅ Phase 0: Turborepo (DONE)
2. Phase 1: Convention & Packages (~1 day)
3. Phase 2: Discovery & Generation (~2 days)
4. Phase 3: Dynamic Loader (~2 days)
5. Phase 4: Host Integration (~1 day)

**Total**: ~6 working days

### Option B: Parallel (Faster)

1. ✅ Phase 0: Turborepo (DONE)
2. **Week 1**:
   - Days 1-2: Phase 1 (Convention & Packages)
   - Days 3-5: Phase 2 (Discovery & Generation) + Phase 3 (Dynamic Loader) in parallel
3. **Week 2**:
   - Days 1-2: Phase 4 (Host Integration)
   - Days 3-5: Testing, documentation, polish

**Total**: ~2 weeks with 2 developers

---

## 📝 How to Use This Roadmap

### For Each Phase:

1. **Read the proposal**:

   ```bash
   cat openspec/changes/{change-name}/proposal.md
   ```

2. **Review tasks**:

   ```bash
   cat openspec/changes/{change-name}/tasks.md
   ```

3. **Implement section by section**, marking tasks complete:

   ```markdown
   - [ ] Task → - [x] Task
   ```

4. **Verify** using the verification commands

5. **Move to next phase**

### Tracking Progress

Each change has its own `tasks.md` with checkboxes. Mark them as you complete:

- `- [ ]` = Not started
- `- [x]` = Complete

### Getting Help

- **Specs**: Full specifications in `openspec/changes/dynamic-microfrontend-registry/specs/`
- **Design**: Design decisions in `openspec/changes/dynamic-microfrontend-registry/design.md`
- **Questions**: Refer to the 245+ scenarios in the specs

---

## 🎯 Success Criteria

After completing all phases, you will have:

✅ Turborepo with smart caching (Phase 0)  
✅ `apps/mfes/mfe-*` naming convention (Phase 1)  
✅ Auto-discovery of micro-frontends (Phase 2)  
✅ Auto-generated `remotes.config.json` (Phase 2)  
✅ Dynamic runtime loader (Phase 3)  
✅ Host loads remotes dynamically (Phase 4)  
✅ Adding new MFE = just create `apps/mfes/mfe-{name}/` (no host changes!)

**Core benefit**: Add/update micro-frontends without rebuilding the host!

---

## 📚 Additional Resources

- **Full specification**: `openspec/changes/dynamic-microfrontend-registry/`
- **Design document**: `openspec/changes/dynamic-microfrontend-registry/design.md`
- **All specs**: `openspec/changes/dynamic-microfrontend-registry/specs/`
- **Original tasks**: `openspec/changes/dynamic-microfrontend-registry/tasks.md` (178 tasks total, includes testing/docs)

---

**Created**: 2026-07-08  
**Last Updated**: 2026-07-08  
**Status**: Phase 0 complete, ready for Phase 1
