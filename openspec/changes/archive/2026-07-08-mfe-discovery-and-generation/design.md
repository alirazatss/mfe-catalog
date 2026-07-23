## Context

With the mfe-\* naming convention and package structures established in Phase 1, Phase 2 implements the core auto-discovery and config generation system. This enables the monorepo to automatically detect all micro-frontends and generate the runtime configuration file without manual intervention.

Current state:

- Package structures exist for monorepo-tools and remote-config (Phase 1)
- One micro-frontend: `apps/mfe-widget/`
- No automated discovery or config generation yet

This phase implements the complete discovery → generation → integration workflow.

## Goals / Non-Goals

**Goals:**

- Implement filesystem-based discovery of all `apps/mfe-*` directories
- Generate valid `remotes.config.json` conforming to JSON Schema
- Support environment-specific URL generation (development vs production)
- Integrate config generation into Turborepo build pipeline
- Ensure generated config is gitignored and regenerated on every build

**Non-Goals:**

- Runtime dynamic loader (Phase 3)
- Host application integration (Phase 4)
- Unit/integration tests (deferred for MVP speed)
- Remote caching or distributed builds

## Decisions

### Decision 1: Use glob for filesystem discovery

**Rationale**: Simple, battle-tested, works in both Node.js and build scripts. The `apps/mfe-*/package.json` pattern is clear and maintainable.

**Alternatives considered**:

- fs.readdir + manual filtering — rejected as more complex and error-prone
- Hardcoded manifest file — rejected as defeats auto-discovery purpose

### Decision 2: Alphabetical port assignment starting at 5174

**Rationale**: Consistent, predictable port allocation. Sorting ensures same micro-frontend always gets same port. Starting at 5174 leaves 5173 for host.

**Alternatives considered**:

- Random port assignment — rejected as unpredictable for developers
- Port from package.json only — rejected as requires manual config for every MFE

### Decision 3: Support custom port/scope overrides via package.json mfe field

**Rationale**: Provides escape hatch for special cases while maintaining auto-discovery default.

Example:

```json
{
  "name": "@mfe-runtine/mfe-widget",
  "mfe": {
    "port": 5200,
    "scope": "customScope"
  }
}
```

### Decision 4: Environment-specific URL generation

**Rationale**: Development needs localhost URLs, production needs CDN/versioned URLs. Git hash versioning enables cache-busting and rollback.

- **Development**: `http://localhost:{port}/remoteEntry.js`
- **Production**: `{baseUrl}/mfe-{name}/v{gitHash}/remoteEntry.js`

**Alternatives considered**:

- Single URL format — rejected as doesn't support both local dev and CDN deployment
- Separate config files per environment — rejected as duplicates structure

### Decision 5: JSON Schema validation before writing config

**Rationale**: Catch errors early. If generated config is invalid, fail fast with clear error message rather than runtime failures.

**Alternatives considered**:

- Skip validation — rejected as errors would surface at runtime
- Validate at consumption time only — rejected as too late to catch generation bugs

### Decision 6: Integrate via Turborepo task + prebuild hook

**Rationale**: Leverages existing Turborepo pipeline. Config regenerates automatically before website build, ensuring it's always fresh.

**Alternatives considered**:

- Manual script invocation — rejected as error-prone (developers forget to run it)
- Watch mode for config generation — rejected as unnecessary complexity

### Decision 7: Use relative imports in CLI script instead of workspace imports

**Rationale**: tsx can't resolve workspace protocol (`workspace:*`) without complex configuration. Relative imports work immediately.

**Alternatives considered**:

- Configure tsx with tsconfig paths — rejected as adds complexity
- Compile script to dist first — rejected as requires build step before running

## Risks / Trade-offs

**Risk**: Glob pattern might miss micro-frontends if naming convention not followed  
→ **Mitigation**: Clear documentation, runtime warning if zero MFEs discovered

**Risk**: Port conflicts if developers run multiple MFEs manually  
→ **Mitigation**: Port conflict detection throws error with helpful message

**Risk**: Generated config file changes every build, breaking Turborepo cache  
→ **Accepted**: Config must regenerate to pick up changes. Cache benefits apply to other parts of build.

**Trade-off**: No validation of URLs at generation time (only schema validation)  
→ **Accepted**: URL validation requires network calls, too slow for build

**Trade-off**: Tests deferred to speed up MVP delivery  
→ **Accepted**: Manual testing sufficient for now, can add tests later

## Migration Plan

**Deployment steps**:

1. ✅ Implement discovery logic in packages/monorepo-tools
2. ✅ Implement config generation logic
3. ✅ Create CLI script with argument parsing
4. ✅ Add generate:config task to turbo.json
5. ✅ Add prebuild hook to website package.json
6. ✅ Add remotes.config.json to .gitignore
7. ✅ Update README documentation

**Rollback strategy**:

- Remove prebuild hook from website package.json
- Remove generate:config task from turbo.json
- Manually create static remotes.config.json if needed

**Verification**:

```bash
# Test manual generation
pnpm generate:config --dry-run

# Test automatic generation
rm apps/website/public/remotes.config.json
pnpm turbo build --filter website
# Config should exist after build

# Test production mode
pnpm generate:config --environment production --git-hash abc123 --base-url https://cdn.example.com
```

## Open Questions

None — implementation is complete and verified.
