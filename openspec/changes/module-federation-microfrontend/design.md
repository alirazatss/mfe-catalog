## Context

The mf-mono project is a Vite Plus monorepo with a single website application (`apps/website`) and utility packages. The current architecture bundles all frontend code into a single deployable unit, limiting team autonomy and deployment flexibility. As the application scales, we need to enable microfrontend architecture using Module Federation to allow:

- Independent development and deployment of feature modules
- Faster build times by avoiding full application rebuilds
- Team ownership of isolated frontend modules
- Runtime composition of modules from different deployment sources

**Current state:**

- Vite Plus build system with TypeScript
- Single React application in `apps/website`
- Monorepo with pnpm workspaces
- No existing module federation infrastructure

**Constraints:**

- Must work with Vite (not webpack)
- Must maintain TypeScript support and type safety
- Must support hot module replacement in development
- Must be compatible with Vite Plus workflow (`vp dev`, `vp build`)

**Stakeholders:**

- Frontend developers who will build and consume microfrontends
- DevOps for deployment and hosting of remote modules

## Goals / Non-Goals

**Goals:**

- Enable Module Federation using `@module-federation/vite`
- Create working host/remote setup with sample widget
- Maintain full TypeScript support with type declarations
- Support both development and production builds
- Document development workflow for microfrontends

**Non-Goals:**

- Production deployment infrastructure for remote modules (separate effort)
- Authentication/authorization for remote modules (future work)
- Server-side rendering (SSR) support (not required initially)
- Dynamic remote discovery or registry (hardcoded remotes for now)
- Shared state management across microfrontends (each is independent)

## Decisions

### Decision 1: Use @module-federation/vite

**Choice:** `@module-federation/vite`  
**Alternatives considered:**

- `@originjs/vite-plugin-federation` (older, less maintained)
- Native Module Federation (webpack only, not Vite compatible)
- vite-plugin-federation-dynamic (experimental, smaller community)
- iframes (poor UX, limited integration, no shared dependencies)

**Rationale:**

- Official plugin from Module Federation organization (recommended by Vite and VoidZero)
- Most actively maintained Vite federation solution (811+ stars, regular updates)
- Best-in-class framework support (React, Vue, Angular, Svelte, Solid, Nuxt, etc.)
- Compatible with webpack Module Federation protocol for cross-bundler federation
- Production-ready with comprehensive examples and documentation
- Works seamlessly with Vite's development server and HMR
- Supports monorepo tools (Nx, Turborepo) out of the box
- Active community and enterprise adoption

### Decision 2: Host application owns shared dependencies

**Choice:** Host defines shared dependency versions; remotes consume host versions  
**Alternatives considered:**

- Each remote bundles all dependencies (massive duplication)
- Version negotiation at runtime (complex, unpredictable)

**Rationale:**

- Prevents duplicate React instances (avoids hooks errors)
- Smaller remote bundle sizes
- Predictable runtime behavior
- Host controls breaking changes via dependency updates
- Aligns with Module Federation best practices

**Shared dependencies:**

- `react` - singleton, host version required
- `react-dom` - singleton, host version required

### Decision 3: Create remote application in monorepo

**Choice:** Create `apps/remote-widget` as a separate Vite app in the monorepo  
**Alternatives considered:**

- Separate repository for remote (complex for demo/getting started)
- Remote as a package in `packages/` (doesn't fit package model)

**Rationale:**

- Easier development with both host and remote in same repo
- Shared tooling and configuration
- Simplified dependency management with pnpm workspaces
- Faster iteration during initial setup
- Can extract to separate repo later if needed

### Decision 4: TypeScript types via declaration files

**Choice:** Generate and manually distribute `.d.ts` files for exposed components  
**Alternatives considered:**

- `@module-federation/typescript` plugin (adds complexity, experimental)
- No types for remote modules (loses type safety)
- Runtime type checking (performance overhead)

**Rationale:**

- Simple and explicit type contracts
- Works with existing TypeScript setup
- No additional build plugins required
- IDE support works out of the box
- Manual distribution acceptable for now; can automate later

### Decision 5: Error boundaries for remote loading

**Choice:** Wrap remote components in React Error Boundaries with fallback UI  
**Alternatives considered:**

- Let host crash on remote failure (poor UX)
- Retry logic with loading spinners (adds complexity)

**Rationale:**

- Graceful degradation when remote unavailable
- Host application remains functional
- Clear error messaging for debugging
- Aligns with React best practices
- Simple to implement

### Decision 6: Development workflow with concurrent servers

**Choice:** Run host on port 5173, remote on port 5174 during development  
**Alternatives considered:**

- Single server with proxy (complex configuration)
- Docker Compose setup (overkill for local dev)

**Rationale:**

- Simple to understand and debug
- Each app has independent HMR
- Standard Vite dev server behavior
- Easy to run with `vp dev` or npm scripts
- Mirrors production architecture (separate origins)

## Risks / Trade-offs

### Risk: Version mismatch between host and remote React

**Impact:** Runtime errors, broken functionality, hooks violations  
**Mitigation:**

- Configure React as singleton in Module Federation
- Document version requirements in package.json
- Add runtime version checks in development mode
- Use pnpm workspace to enforce consistent versions in monorepo

### Risk: Remote module fails to load in production

**Impact:** Missing functionality, poor user experience  
**Mitigation:**

- Error boundaries with fallback UI
- Console logging for debugging
- Document hosting requirements for remote modules
- Consider health check endpoints for remotes (future)

### Risk: TypeScript types become out of sync with remote

**Impact:** Type errors at runtime despite compile-time success  
**Mitigation:**

- Version .d.ts files alongside remoteEntry.js
- Document process for updating types when remote changes
- Consider automated type generation in future iterations
- Use integration tests to catch type mismatches

### Risk: Build time increases with multiple apps

**Impact:** Slower CI/CD pipelines  
**Mitigation:**

- Vite Plus caching already enabled
- Remote can be built independently (parallel builds)
- Only rebuild remote when its code changes
- Consider build cache in CI (future optimization)

### Trade-off: Monorepo vs separate repos

**Current choice:** Monorepo for simplicity  
**Trade-off:** Limits independent deployment; couples release cycles  
**Future path:** Can extract remote to separate repo once workflow is proven

### Trade-off: Manual type distribution vs automated types

**Current choice:** Manual `.d.ts` files  
**Trade-off:** Requires manual updates; potential for drift  
**Future path:** Automate with type generation plugin once stable

## Migration Plan

**Phase 1: Setup (this change)**

1. Install `@module-federation/vite` dependency
2. Configure host application with federation plugin
3. Create remote-widget application
4. Implement sample widget component
5. Test development workflow with concurrent servers
6. Test production build and bundle output
7. Document setup and usage

**Phase 2: Integration (follow-up work - not in this change)**

1. Identify first real feature to extract as microfrontend
2. Extract feature into new remote application
3. Update host to consume new remote
4. Deploy remote to staging environment
5. Configure production URLs for remote modules

**Rollback strategy:**

- All changes are additive (new files, new dependencies)
- Host can run without federation plugin (just don't load remotes)
- No database or backend changes
- Simple rollback: revert git commit and redeploy

## Open Questions

1. **Remote hosting strategy for production?**
   - CDN? S3 + CloudFront? Same domain with subdirectory?
   - Resolution: Out of scope for this change; document as prerequisite for production use

2. **How to handle remote versioning and cache invalidation?**
   - Hash in filename? Query parameter? Version manifest?
   - Resolution: Defer to deployment phase; Vite handles hashing by default

3. **Should we support loading remotes from external domains (CORS)?**
   - Resolution: Not initially; all remotes from same origin for now

4. **What's the testing strategy for federated modules?**
   - Unit tests per remote? Integration tests for host+remote?
   - Resolution: Add to tasks.md; use standard Vitest setup for now
