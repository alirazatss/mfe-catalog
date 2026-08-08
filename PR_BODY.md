# Task Group 1: Generator Foundation and MFE Generator

## Task 1.1: Add @turbo/gen and scaffold config

**Status**: In Progress
**Requirement**: app-scaffolding: MFE generator requirement

### Files Created

- turbo/generators/config.ts
- turbo/generators/lib/validation.ts
- turbo/generators/lib/port-assignment.ts
- turbo/generators/lib/summary.ts
- turbo/generators/templates/mfe/package.json.hbs
- turbo/generators/templates/mfe/vite.config.ts.hbs
- turbo/generators/templates/mfe/vitest.config.ts.hbs
- turbo/generators/templates/mfe/tsconfig.json.hbs
- turbo/generators/templates/mfe/index.html.hbs
- turbo/generators/templates/mfe/src/bootstrap.ts.hbs
- turbo/generators/templates/mfe/src/main.ts.hbs
- turbo/generators/templates/mfe/src/App.tsx.hbs
- turbo/generators/templates/mfe/src/App.test.tsx.hbs
- turbo/generators/templates/mfe/src/test/setup.ts.hbs
- turbo/generators/templates/mfe/README.md.hbs

### Files Modified

- package.json (added gen script, @turbo/gen dependency)
- pnpm-workspace.yaml (added @turbo/gen to catalog)

### Verification

Running: pnpm gen mfe (dry-run simulation - actual test in task 1.5)

**Status**: ✅ Complete

---

## Task 1.2-1.4: Template creation, port assignment, summary

**Status**: ✅ Complete (implemented alongside 1.1)
**Requirements**:

- app-scaffolding: MFE generator requirement (template)
- app-scaffolding: port assignment requirement
- app-scaffolding: run summary scenario

All template files created with:

- Lifecycle exports (bootstrap/mount/unmount)
- Standalone dev entry (main.ts + index.html)
- Minimal App.tsx with routing
- Vite/vitest/tsconfig
- Test setup with starter test
- README

Port assignment implemented via discoverMicroFrontends() pattern.
Summary action prints created/modified files and manual steps.

---

## Task 1.5: Verification - Scaffold mfe-scratch

**Status**: In Progress
