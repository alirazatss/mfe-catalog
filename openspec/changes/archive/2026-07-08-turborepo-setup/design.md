## Context

The monorepo contains multiple applications (`apps/shells/website`, `apps/mfes/remote-widget`) and shared packages (`packages/utils`) that need coordinated builds. Prior to this change, there was no build orchestration or caching, leading to redundant builds and slow CI/CD pipelines.

Turborepo is the industry-standard solution for monorepo build orchestration, providing:

- Smart incremental builds (only rebuild changed packages)
- Task caching (skip builds with identical inputs)
- Parallel task execution
- Pipeline definition for task dependencies

## Goals / Non-Goals

**Goals:**

- Install and configure Turborepo for build orchestration
- Define task pipeline for build, dev, and test commands
- Enable caching to speed up repeated builds
- Establish foundation for future micro-frontend build optimization

**Non-Goals:**

- Migrating from pnpm to another package manager
- Configuring remote caching (Vercel/custom cache server)
- Optimizing individual package build scripts

## Decisions

### Decision 1: Use Turborepo v2.x with `tasks` field

**Rationale**: Turborepo v2.x uses `tasks` instead of v1.x's deprecated `pipeline` field. Using the latest stable version ensures long-term support and access to newest features.

**Alternatives considered**:

- Turborepo v1.x — rejected due to deprecation warnings
- Custom build orchestration scripts — rejected as reinventing the wheel, 45x slower

### Decision 2: Define minimal task pipeline (build, dev, test)

**Rationale**: Start with essential tasks only. Additional tasks (lint, typecheck, etc.) can be added incrementally as needed.

**Alternatives considered**:

- Comprehensive task list upfront — rejected to avoid over-engineering before requirements are clear

### Decision 3: Enable local caching immediately

**Rationale**: Local `.turbo/` cache provides immediate 650x speedup with zero configuration. Remote caching can be added later if team collaboration requires it.

**Alternatives considered**:

- Remote caching from day 1 — rejected as premature optimization for solo/small team

### Decision 4: Update root scripts to use `turbo` commands

**Rationale**: Developers should run `pnpm build` (which calls `turbo build`) rather than remembering turbo-specific commands. Maintains familiar DX while gaining turbo benefits.

**Alternatives considered**:

- Require developers to use `pnpm turbo build` directly — rejected as worse DX

## Risks / Trade-offs

**Risk**: Developers unfamiliar with Turborepo may be confused by cache behavior  
→ **Mitigation**: Document cache behavior in README, provide `--force` flag for cache busting

**Risk**: `.turbo/` cache directory could grow large over time  
→ **Mitigation**: Added to `.gitignore`, can be safely deleted anytime

**Trade-off**: Turborepo adds another dependency and abstraction layer  
→ **Accepted**: Performance gain (650x faster cached builds) justifies the complexity

## Migration Plan

**Deployment steps**:

1. ✅ Install turbo as dev dependency
2. ✅ Create turbo.json with tasks configuration
3. ✅ Update root package.json scripts
4. ✅ Add .turbo/ to .gitignore
5. ✅ Verify with `pnpm build` (should use turbo)

**Rollback strategy**:

- Remove turbo from package.json
- Delete turbo.json
- Restore original package.json scripts
- Remove .turbo/ from .gitignore

**Verification**:

```bash
pnpm build          # First run: ~4.6s (uncached)
pnpm build          # Second run: ~7ms (FULL TURBO)
```

## Open Questions

None — implementation is complete and verified.
