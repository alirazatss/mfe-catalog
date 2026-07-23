## Context

Following the Turborepo setup, the monorepo needs to adopt a consistent naming convention for micro-frontends and establish the foundational packages that will enable auto-discovery and config generation.

Current state:

- One micro-frontend exists: `apps/mfes/remote-widget/`
- No convention established for naming micro-frontends
- No packages exist for discovery or config management

This change establishes the foundation for the dynamic micro-frontend system by:

1. Adopting the `apps/mfes/mfe-*` directory naming convention
2. Creating `@mfe-runtine/monorepo-tools` package for discovery and config generation logic
3. Creating `@mfe-runtine/remote-config` package for JSON Schema and validation

## Goals / Non-Goals

**Goals:**

- Establish `mfe-*` naming convention for all micro-frontends
- Create package structure for monorepo-tools (discovery and config generation utilities)
- Create package structure for remote-config (schema and validation)
- Ensure all packages build successfully with Turborepo
- Maintain backward compatibility with existing Module Federation setup

**Non-Goals:**

- Implementing the actual discovery logic (Phase 2)
- Implementing the actual config generation logic (Phase 2)
- Changing Module Federation scope names (keep "remoteWidget" for now)
- Updating host application imports (Phase 4)

## Decisions

### Decision 1: Use `apps/mfes/mfe-*` naming convention

**Rationale**: Convention over configuration. All micro-frontends follow a predictable pattern that can be discovered automatically. The `mfe-` prefix clearly identifies micro-frontends vs other apps (like `website`).

**Alternatives considered**:

- `apps/microfrontends/widget/` — rejected as too deeply nested, harder to filter in Turborepo
- No prefix (just `apps/widget/`) — rejected as ambiguous (is widget an MFE or standalone app?)

### Decision 2: Use scoped package names (`@mfe-runtine/mfe-widget`)

**Rationale**: Follows npm conventions, avoids name collisions, clearly identifies packages as part of this monorepo.

**Alternatives considered**:

- Unscoped names (`mfe-widget`) — rejected as more prone to conflicts
- Different scope (`@microfrontend/widget`) — rejected to keep consistency with existing packages

### Decision 3: Keep Module Federation scope names unchanged

**Rationale**: Module Federation scope (`remoteWidget`) is separate from package naming. Changing it would break the host application. The scope will be migrated when implementing Phase 4 (host integration).

**Alternatives considered**:

- Change scope to `mfeWidget` immediately — rejected as breaks existing host, no benefit until dynamic loader is ready

### Decision 4: Create skeleton packages with placeholder implementations

**Rationale**: Establishes package structure and TypeScript types now, implements logic in Phase 2. This allows other packages to depend on types immediately.

**Alternatives considered**:

- Wait until Phase 2 to create packages — rejected as creates circular dependency issues
- Create fully implemented packages now — rejected as too much work for one phase

### Decision 5: Use JSON Schema Draft 7 for validation

**Rationale**: Draft 7 is widely supported, stable, and has excellent TypeScript tooling (Ajv). Draft 2020-12 offers no significant advantages for our use case.

**Alternatives considered**:

- JSON Schema Draft 2020-12 — rejected as unnecessary complexity
- Zod or TypeScript-first validation — rejected to allow non-TypeScript consumers to validate config

### Decision 6: Add `glob` and `ajv` to pnpm catalog

**Rationale**: Centralized version management for commonly used packages across the monorepo.

**Alternatives considered**:

- Add to individual package.json without catalog — rejected as harder to maintain version consistency

## Risks / Trade-offs

**Risk**: Renaming `apps/mfes/remote-widget` might break existing documentation or scripts  
→ **Mitigation**: Updated root package.json scripts immediately. Documentation updates can follow.

**Risk**: Placeholder implementations in packages might be confusing  
→ **Mitigation**: Added clear TODO comments indicating Phase 2 implementation

**Trade-off**: Creating package structure before implementation adds files that don't do much yet  
→ **Accepted**: Enables proper type checking and dependency management from the start

**Risk**: Module Federation scope mismatch (directory: `mfe-widget`, scope: `remoteWidget`)  
→ **Mitigation**: Documented that scope migration happens in Phase 4, no functional impact

## Migration Plan

**Deployment steps**:

1. ✅ Rename `apps/mfes/remote-widget/` → `apps/mfes/mfe-widget/`
2. ✅ Update package.json to `@mfe-runtine/mfe-widget`
3. ✅ Update root scripts to use scoped package name
4. ✅ Create `packages/monorepo-tools/` structure
5. ✅ Create `packages/remote-config/` structure
6. ✅ Add `glob` and `ajv` to pnpm catalog
7. ✅ Run `pnpm install` to install dependencies
8. ✅ Verify all packages build successfully

**Rollback strategy**:

- Rename `apps/mfes/mfe-widget/` back to `apps/mfes/remote-widget/`
- Restore package.json names
- Delete `packages/monorepo-tools/` and `packages/remote-config/`
- Remove `glob` and `ajv` from catalog
- Run `pnpm install`

**Verification**:

```bash
pnpm build  # Should build all 5 packages with FULL TURBO on second run
ls packages/  # Should show monorepo-tools/ and remote-config/
ls apps/  # Should show mfe-widget/ (not remote-widget/)
```

## Open Questions

None — implementation is complete and verified.
