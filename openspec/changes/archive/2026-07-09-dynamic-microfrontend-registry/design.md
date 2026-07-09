## Context

The current micro-frontend setup uses Module Federation with a single hardcoded remote in `vite.config.ts`. This doesn't scale to a monorepo with many micro-frontends where:

- Adding new micro-frontends requires manually updating host's `vite.config.ts`
- CI/CD builds the entire monorepo even when only one app changed
- No convention exists for auto-discovering micro-frontends
- Deployment costs are high (rebuilding/deploying everything on every commit)

The existing codebase has prepared for this with `apps/website/src/config/remotes.ts` which includes three strategies. We're implementing **build-time discovery + runtime loading** optimized for monorepo workflows.

**Current architecture:**

- Monorepo: pnpm workspace with `apps/*` and `packages/*`
- Host: `apps/website` - Vanilla TypeScript app on Vite
- Remote: `apps/remote-widget` - Vanilla TypeScript widget (will become `apps/mfe-widget`)
- Build tool: Vite Plus (wrapper around Vite)
- Module Federation: `@module-federation/vite` v1.16.12
- Package manager: pnpm with workspace protocol
- No framework (vanilla TypeScript, no React/Vue/Angular)

**Constraints:**

- All micro-frontends live in same monorepo (`apps/mfe-*`)
- Must only build/deploy changed apps (git-aware selective builds)
- Must work with pnpm workspaces and existing Vite setup
- Solution must be framework-agnostic (vanilla TypeScript)
- Discovery must be automatic (convention over configuration)

**Stakeholders:**

- Frontend developers: Need to add micro-frontends by creating `apps/mfe-{name}/` folder
- DevOps/CI: Need fast builds (only changed apps)
- Monorepo maintainers: Need consistent conventions across all micro-frontends

## Goals / Non-Goals

**Goals:**

- Auto-discover micro-frontends by scanning `apps/mfe-*` directories
- Generate `remotes.config.json` at build time from discovered micro-frontends
- Detect changed apps via git and only build those (selective builds)
- Support multiple micro-frontends without manual host configuration
- Use convention over configuration (naming pattern determines behavior)
- Provide TypeScript types and JSON Schema for generated config
- Enable runtime loading of any discovered remote via dynamic loader
- Support environment-specific URLs (localhost for dev, deployed paths for prod)

**Non-Goals:**

- External micro-frontends outside monorepo (all remotes are in `apps/mfe-*`)
- Manual config files (everything auto-generated from filesystem)
- CDN-based remote deployment (monorepo deploys to single domain)
- Backend API for config management (build-time generation only)
- Version management with semver constraints (use git commit hashes)
- A/B testing or canary deployments (future enhancement)
- Health check endpoints (future enhancement)
- Hot-reload of config without page refresh (future enhancement)

## Decisions

### Decision 1: Convention-based discovery via `apps/mfe-*` naming pattern

**Chosen approach:** Any directory matching `apps/mfe-*` pattern is automatically discovered as a micro-frontend.

**Alternatives considered:**

1. **Manifest file** - Require `mfe.config.json` in each micro-frontend
   - ❌ Boilerplate for every new micro-frontend
   - ❌ Can forget to create manifest
2. **Naming convention `apps/mfe-*`** ✅
   - ✅ Zero configuration needed
   - ✅ Self-documenting (obvious which apps are micro-frontends)
   - ✅ Easy to discover via filesystem glob
   - ✅ Consistent with monorepo patterns
3. **Explicit registration** - List remotes in root config
   - ❌ Still requires manual updates when adding remotes
   - ❌ Defeats the purpose of auto-discovery

**Rationale:** Convention over configuration minimizes boilerplate. Pattern `mfe-*` is explicit and searchable. Inspired by Next.js `pages/` convention.

**Implementation:**

```typescript
// Discovery logic
const microFrontends = await glob("apps/mfe-*/package.json");
```

### Decision 2: Build-time config generation, runtime loading

**Chosen approach:** Generate `remotes.config.json` during host build, load at runtime via dynamic loader.

**Alternatives considered:**

1. **Pure runtime discovery** - Scan filesystem at runtime in browser
   - ❌ Impossible (browsers can't read server filesystem)
2. **Build-time generation + runtime loading** ✅
   - ✅ Config generation happens once per build
   - ✅ Runtime loads pre-computed config (fast)
   - ✅ Works in browser environment
   - ✅ Config can be inspected/debugged
3. **Fully static Vite config** - Generate `vite.config.ts` at build time
   - ❌ Still hardcoded at build time
   - ❌ Can't swap remotes without rebuild

**Rationale:** Build-time generation with runtime loading balances performance and flexibility. Config is computed once, used many times.

**Workflow:**

```
Build time:
1. Scan apps/mfe-* directories
2. Read package.json from each
3. Generate remotes.config.json
4. Copy to public/ directory

Runtime:
1. Fetch /remotes.config.json
2. Parse and validate
3. Load remotes dynamically via Module Federation
```

### Decision 3: Use Turborepo for incremental builds and caching

**Chosen approach:** Add Turborepo to monorepo for smart change detection, caching, and parallel builds.

**Alternatives considered:**

1. **Always build everything**
   - ❌ Slow for large monorepos (10+ micro-frontends)
   - ❌ Wastes CI minutes
   - ❌ Slow developer iteration
2. **Custom git diff scripts + pnpm filter**
   - ⚠️ Requires maintaining custom scripts
   - ⚠️ No caching (rebuild even if code unchanged)
   - ⚠️ No dependency graph awareness
   - ⚠️ No remote cache sharing
3. **Turborepo** ✅
   - ✅ Automatic change detection (no git diff scripts)
   - ✅ Content-based caching (hash inputs, cache outputs)
   - ✅ Remote cache sharing (Vercel Remote Cache or self-hosted)
   - ✅ Parallel execution with dependency awareness
   - ✅ Works seamlessly with pnpm workspaces
   - ✅ Zero configuration needed for basic setup
   - ✅ Industry standard (used by Vercel, Shopify, Netflix)
4. **Nx**
   - ⚠️ More complex than Turborepo
   - ⚠️ Heavier learning curve
   - ⚠️ More features than needed for MVP

**Rationale:** Turborepo is the simplest, most powerful solution for monorepo builds. It's specifically designed for pnpm workspaces and requires minimal configuration. The caching alone saves massive CI time.

**Key benefits:**

- **Local cache**: Developer rebuilds app → instant (cached)
- **Remote cache**: CI pulls cached builds from previous runs
- **Dependency graph**: If host changes, Turborepo knows to rebuild host only (remotes unchanged)
- **Parallel builds**: Build all changed micro-frontends simultaneously

**Implementation:**

```bash
# Install Turborepo
pnpm add -Dw turbo

# Build all apps (only rebuilds changed)
turbo build

# Dev mode for specific app
turbo dev --filter website

# Dev mode for all micro-frontends
turbo dev --filter "mfe-*"

# CI: Build with remote cache
turbo build --cache-dir=.turbo --token=$TURBO_TOKEN
```

**Turborepo configuration** (`turbo.json`):

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "generate:config": {
      "outputs": ["public/remotes.config.json"]
    }
  }
}
```

**How it works:**

1. Developer changes `apps/mfe-widget/src/CounterWidget.ts`
2. Developer runs `turbo build`
3. Turborepo:
   - Detects mfe-widget changed (file hash differs)
   - Detects mfe-dashboard unchanged (hash matches cache)
   - Builds mfe-widget only
   - Serves mfe-dashboard from cache (instant)
   - Regenerates host config (depends on all mfe-\*)
   - Rebuilds host (config changed)
4. Total time: ~5 seconds (instead of rebuilding everything)

### Decision 4: Environment-specific URLs via build-time generation

**Chosen approach:** Generate different `remotes.config.json` per environment based on build target.

**Alternatives considered:**

1. **Single config with environment sections**
   - ❌ Sends all environments to client
   - ❌ Confusing which URLs are active
2. **Build-time environment detection** ✅
   - ✅ Only includes URLs for target environment
   - ✅ Development: `http://localhost:517x`
   - ✅ Production: `/mfe-{name}/v{commit}/assets/remoteEntry.js`
   - ✅ Can use environment variables (VITE_APP_URL)
3. **Runtime environment detection**
   - ⚠️ Complex logic in browser
   - ⚠️ Can't know deployment URLs at runtime

**Rationale:** Build knows the deployment target. Generate correct URLs at build time, not runtime.

**Example generated configs:**

Development (`NODE_ENV=development`):

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js",
      "scope": "mfeWidget"
    },
    {
      "name": "mfe-dashboard",
      "entryUrl": "http://localhost:5175/assets/remoteEntry.js",
      "scope": "mfeDashboard"
    }
  ]
}
```

Production (`NODE_ENV=production`):

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "/mfe-widget/v{gitHash}/assets/remoteEntry.js",
      "scope": "mfeWidget"
    },
    {
      "name": "mfe-dashboard",
      "entryUrl": "/mfe-dashboard/v{gitHash}/assets/remoteEntry.js",
      "scope": "mfeDashboard"
    }
  ]
}
```

### Decision 5: Monorepo package structure

**Chosen approach:** Create reusable packages for discovery, generation, and loading.

**Structure:**

```
packages/
  monorepo-tools/          # Discovery and config generation (Node.js)
    src/
      discovery.ts         # Scan apps/mfe-* for micro-frontends
      config-generator.ts  # Generate remotes.config.json
      types.ts             # Shared types
    index.ts

  remote-config/           # Shared config schema and validation (Browser + Node)
    schema.json            # JSON Schema
    src/
      types.ts             # TypeScript types
      validation.ts        # JSON Schema validation (browser)
    index.ts

  dynamic-loader/          # Runtime loader (Browser)
    src/
      DynamicLoader.ts     # Main class
      config.ts            # Config fetching
      events.ts            # Event emitter
    index.ts

scripts/
  generate-config.ts       # CLI tool to generate config

turbo.json                 # Turborepo pipeline configuration
```

**Rationale:**

- `monorepo-tools`: Node.js-only utilities for build system
- `remote-config`: Shared types and validation (works in Node and browser)
- `dynamic-loader`: Browser-only runtime loader
- Clear separation of concerns
- Turborepo orchestrates builds across all packages

### Decision 6: Metadata extraction from package.json

**Chosen approach:** Read `name`, `version`, `description` from each micro-frontend's `package.json`.

**Alternatives considered:**

1. **Separate metadata file** (mfe.config.json)
   - ❌ Duplication with package.json
   - ❌ Extra file to maintain
2. **Read from package.json** ✅
   - ✅ Single source of truth
   - ✅ Already exists in every app
   - ✅ Version comes from package.json naturally
3. **Hardcoded in generator**
   - ❌ Not maintainable
   - ❌ Loses metadata

**Rationale:** package.json already has all needed metadata. No need for separate file.

**Extraction logic:**

```typescript
const pkg = JSON.parse(await fs.readFile("apps/mfe-widget/package.json", "utf-8"));
const remote = {
  name: pkg.name.replace("@mf-mono/", ""), // "mfe-widget"
  version: pkg.version, // "1.0.0"
  description: pkg.description,
  // ... generate URLs
};
```

### Decision 7: Port allocation convention for development

**Chosen approach:** Assign ports based on alphabetical order or explicit config in package.json.

**Alternatives considered:**

1. **Random ports**
   - ❌ Changes between runs
   - ❌ Hard to remember
2. **Alphabetical order starting at 5174** ✅
   - ✅ Predictable and consistent
   - ✅ mfe-dashboard: 5174, mfe-widget: 5175, etc.
   - ✅ Easy to calculate
3. **Explicit port in package.json**
   - ✅ Full control
   - ⚠️ Must avoid conflicts manually
   - ✅ Can override alphabetical default

**Rationale:** Start with convention (alphabetical), allow override in package.json if needed.

**Example package.json override:**

```json
{
  "name": "@mf-mono/mfe-widget",
  "mfe": {
    "port": 5174
  }
}
```

### Decision 8: Generated config location and versioning

**Chosen approach:** Generate to `apps/website/public/remotes.config.json`, gitignore it, regenerate on every build.

**Alternatives considered:**

1. **Commit generated config to git**
   - ❌ Git conflicts when multiple people add remotes
   - ❌ Easy to forget to regenerate
2. **Gitignore and regenerate on every build** ✅
   - ✅ Always fresh and accurate
   - ✅ No git conflicts
   - ✅ Single source of truth (filesystem structure)
   - ✅ CI always generates fresh config
3. **Store in separate file outside public/**
   - ❌ Requires serving from different location
   - ❌ Complicates deployment

**Rationale:** Generated files should not be committed. Regeneration is fast (milliseconds).

**.gitignore addition:**

```
apps/website/public/remotes.config.json
```

## Risks / Trade-offs

### Risk: Port conflicts in development

**Risk:** Multiple micro-frontends assigned to same port causes conflicts.

**Mitigation:**

- Use alphabetical ordering with sufficient spacing (5174, 5175, 5176...)
- Allow override via `mfe.port` in package.json
- Document port allocation convention clearly
- Add port conflict detection in discovery script (warn if duplicate)

### Risk: Config generation fails during build

**Risk:** If discovery script errors, build fails and config is missing.

**Mitigation:**

- Wrap generation in try-catch, use fallback static config
- Validate generated config against JSON Schema before writing
- Emit clear error messages with hints (e.g., "Check package.json in apps/mfe-foo")
- Fail build loudly (don't silently skip remotes)

### Risk: Turborepo cache invalidation issues

**Risk:** Cached builds used when source actually changed (rare but possible with hash collisions).

**Mitigation:**

- Turborepo uses robust hashing (content-based, not timestamp)
- Add `--force` flag option to bypass cache if suspected
- Monitor cache hit rates in CI (very low hit rate = cache issues)
- Document cache debugging: `turbo build --dry-run=json` shows what will run

### Risk: Turborepo adds external dependency

**Risk:** Relying on external tool (Turborepo) for critical build infrastructure.

**Mitigation:**

- Turborepo is maintained by Vercel (stable, well-funded)
- Fallback: Can still use `pnpm --filter` without Turborepo
- Config is simple JSON (`turbo.json`), easy to understand and modify
- Active community and extensive documentation
- License: MIT (open source, permissive)

### Risk: Circular dependencies between remotes

**Risk:** mfe-A loads mfe-B which loads mfe-A causes infinite loop.

**Mitigation:**

- Document anti-pattern clearly
- Add runtime detection: track loading stack, error if circular
- Emit warning if potential circular dependency detected (future enhancement)
- Enforce architectural rule: only host loads remotes, remotes don't load each other

### Trade-off: All micro-frontends in same monorepo

**Trade-off:** Cannot load remotes from external sources or other repos.

**Justification:**

- Simplifies build and deployment (everything in one place)
- Easier dependency management (pnpm workspace)
- Faster iteration (no cross-repo coordination)
- Future: Can add external remote support if needed

### Trade-off: Config auto-generated, not manually editable

**Trade-off:** Cannot manually tweak config without changing filesystem structure.

**Justification:**

- Ensures consistency (filesystem is single source of truth)
- Prevents config drift (can't forget to update after file changes)
- Simpler mental model (what you see in `apps/` is what you get)
- Future: Can add manual overrides via package.json `mfe` field if needed

### Trade-off: No versioning across micro-frontends

**Trade-off:** All micro-frontends deploy together, no independent versioning.

**Justification:**

- Simpler for MVP (monorepo deploys as atomic unit)
- Avoids version compatibility matrix complexity
- Faster development (no version negotiation)
- Future: Can add independent versioning with git hashes or tags if needed

## Migration Plan

### Phase 1: Install Turborepo and rename existing remote (Week 1)

1. Install Turborepo: `pnpm add -Dw turbo`
2. Create `turbo.json` with basic pipeline configuration
3. Update root `package.json` scripts to use `turbo` instead of `vp run`
4. Rename `apps/remote-widget/` to `apps/mfe-widget/`
5. Update package.json name to `@mf-mono/mfe-widget`
6. Test Turborepo: `turbo build` and verify both apps build
7. Verify caching: `turbo build` again should be instant (cached)

**Validation:**

- `turbo build` builds both website and mfe-widget
- Second `turbo build` uses cache (instant)
- `turbo dev --filter website` starts host in dev mode

### Phase 2: Create discovery and config generation packages (Week 1-2)

1. Create `packages/monorepo-tools/` with discovery skeleton
2. Create `packages/remote-config/` with schema and types
3. Create `packages/dynamic-loader/` with loader skeleton
4. Implement `packages/monorepo-tools/src/discovery.ts`
   - Scan `apps/mfe-*/` directories
   - Read package.json from each
   - Extract name, version, description, assign ports
5. Implement `packages/monorepo-tools/src/config-generator.ts`
   - Generate `remotes.config.json` from discovered apps
   - Handle dev vs prod URL generation
6. Create `scripts/generate-config.ts` CLI tool
7. Add to Turborepo pipeline: `"generate:config"` task

**Validation:**

- Running `turbo generate:config` creates valid `remotes.config.json`
- Config includes all `apps/mfe-*` apps
- JSON Schema validation passes
- Turborepo caches generation (instant on re-run)

### Phase 3: Integrate config generation into host build (Week 2)

1. Update `apps/website/package.json` to add `prebuild` script
   ```json
   {
     "scripts": {
       "prebuild": "pnpm generate:config",
       "generate:config": "tsx ../../scripts/generate-config.ts",
       "build": "vite build"
     }
   }
   ```
2. Update `turbo.json` to ensure config generation runs before host build
   ```json
   {
     "pipeline": {
       "generate:config": {
         "dependsOn": ["^build"],
         "outputs": ["apps/website/public/remotes.config.json"]
       },
       "build": {
         "dependsOn": ["generate:config"],
         "outputs": ["dist/**"]
       }
     }
   }
   ```
3. Gitignore `apps/website/public/remotes.config.json`
4. Run `turbo build` and verify config regenerated
5. Keep static remotes in vite.config.ts as fallback

**Validation:**

- `turbo build` automatically generates config before building host
- Config file appears in `dist/` output
- Turborepo dependency graph correct (config → host build)

### Phase 4: Implement dynamic loader and integrate (Week 2-3)

1. Implement `packages/dynamic-loader/src/DynamicLoader.ts`
2. Implement config fetching from `/remotes.config.json`
3. Update `apps/website/src/config/remotes.ts` to use DynamicLoader
4. Update `apps/website/src/RemoteWidgetLoader.ts` to use loader
5. Test locally: config loads, remote loads dynamically
6. Add event listeners for logging

**Validation:**

- Dev environment loads mfe-widget via generated config
- Deleting config file still works (fallback to static)
- Console shows config load events
- Turborepo cache works (changing loader rebuilds host)

### Phase 5: Configure Turborepo for dev mode (Week 3)

1. Update `turbo.json` dev task configuration
   ```json
   {
     "pipeline": {
       "dev": {
         "cache": false,
         "persistent": true
       }
     }
   }
   ```
2. Update root `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "turbo dev --filter website",
       "dev:mfe": "turbo dev --filter 'mfe-*'",
       "dev:all": "turbo dev"
     }
   }
   ```
3. Test parallel dev servers: `pnpm dev:all`
4. Verify hot reload works for both host and remotes

**Validation:**

- `pnpm dev:all` starts all apps in parallel
- Changes to mfe-widget trigger HMR
- Changes to host trigger HMR
- Both dev servers run simultaneously

### Phase 6: Add second micro-frontend and verify Turborepo (Week 3)

1. Create `apps/mfe-dashboard/` by copying mfe-widget structure
2. Implement simple dashboard component
3. Run `turbo generate:config` (or just `turbo build`)
4. Verify both remotes appear in config
5. Test Turborepo incremental builds:
   - Change mfe-widget code
   - Run `turbo build`
   - Verify only mfe-widget rebuilds (mfe-dashboard cached)
6. Update host to conditionally load dashboard

**Validation:**

- Config includes both mfe-widget and mfe-dashboard
- Both remotes load independently
- Turborepo only rebuilds changed apps
- Cache hit rate >50% on unchanged apps

### Phase 7: Configure CI/CD with Turborepo (Week 3-4)

1. Update `.github/workflows/ci.yml` (or equivalent)

   ```yaml
   - name: Build with Turborepo
     run: turbo build --filter="[HEAD^1]" # Only changed since last commit

   - name: Setup Turborepo remote cache (optional)
     run: turbo build --token=${{ secrets.TURBO_TOKEN }}
   ```

2. Configure Turborepo remote cache (optional but recommended):
   - Option A: Vercel Remote Cache (free for open source)
   - Option B: Self-hosted cache server
   - Option C: GitHub Actions cache
3. Test in CI: verify only changed apps build
4. Measure build time improvement (should be 50-80% faster)

**Validation:**

- CI builds only changed apps
- Remote cache works (subsequent runs faster)
- Build artifacts cached and reused

### Phase 8: Documentation and finalization (Week 4)

1. Update `README.md` with Turborepo commands
2. Document monorepo conventions (`apps/mfe-*` pattern)
3. Document how to add new micro-frontend
4. Document Turborepo caching behavior
5. Update `docs/PRODUCTION_DEPLOYMENT.md` with Turborepo deployment
6. Create example micro-frontend template
7. Add troubleshooting guide for cache issues

**Validation:**

- Developers can follow docs to create new micro-frontend
- Turborepo commands documented
- Cache behavior explained

### Rollback Strategy

If Turborepo causes issues:

1. **Immediate:** Revert to direct pnpm commands
   ```json
   {
     "scripts": {
       "build": "pnpm -r build" // Instead of "turbo build"
     }
   }
   ```
   - Everything still works (Turborepo is wrapper around pnpm)
   - Just lose caching benefit
2. **Temporary:** Clear Turborepo cache
   ```bash
   rm -rf .turbo
   turbo build --force  # Rebuild everything
   ```
3. **Full rollback:** Remove Turborepo entirely
   - `pnpm remove -Dw turbo`
   - Delete `turbo.json`
   - Revert package.json scripts to use `vp run -r` or `pnpm -r`
   - Everything still works (no breaking changes)

**Safety:** Turborepo is additive (pure performance optimization). Removing it doesn't break functionality.

## Open Questions

1. **Port allocation strategy:** Should we use alphabetical order or allow explicit port config?
   - **Lean toward:** Start with alphabetical (5174, 5175, 5176...), allow override in package.json
2. **Production URL pattern:** What path structure for deployed remotes?
   - **Lean toward:** `/mfe-{name}/v{gitHash}/assets/remoteEntry.js` for versioning and cache-busting
3. **Shared dependencies:** How to handle common libraries across micro-frontends?
   - **Lean toward:** Configure in each mfe's vite.config.ts, host decides version (current Module Federation pattern)

4. **Config validation in CI:** Should we add pre-commit hook to validate generated config?
   - **Lean toward:** Yes, add `pnpm run validate:config` that runs after generation

5. **Mono-deploy vs independent deploys:** Deploy all changed apps atomically or one at a time?
   - **Lean toward:** Atomic deployment (all or nothing) for MVP, independent later

6. **Hot reload across remotes:** Should changes to remote trigger hot reload in host?
   - **Lean toward:** No for MVP (requires complex dev server coordination), future enhancement
