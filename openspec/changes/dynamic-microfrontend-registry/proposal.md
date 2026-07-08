## Why

The current micro-frontend setup hardcodes a single remote in `vite.config.ts`, making it difficult to scale to multiple micro-frontends. In a monorepo with many micro-frontends (apps/mfe-\*), teams need a way to automatically discover and configure remotes without manually updating the host's build config. Additionally, the build system should detect which micro-frontends changed (via git) and only build/deploy those, not the entire monorepo.

## What Changes

- Move remote configurations from hardcoded `vite.config.ts` to **auto-generated JSON config**
- Implement **monorepo discovery** that scans `apps/` directory for micro-frontends and auto-generates config
- Add **Turborepo** for smart incremental builds, caching, and parallel execution
- Create **convention-based remote registration** (any `apps/mfe-*` automatically becomes a remote)
- Generate **environment-specific URLs** based on deployment target (localhost for dev, versioned paths for prod)
- Implement **Dynamic Remote Loader** that reads generated config at runtime
- Configure **Turborepo pipeline** to build only changed micro-frontends and cache unchanged ones

## Capabilities

### New Capabilities

- `monorepo-discovery`: Automatic detection of micro-frontends in `apps/` directory by naming convention
- `config-generation`: Build-time generation of `remotes.config.json` from discovered micro-frontends
- `turborepo-integration`: Incremental builds with caching using Turborepo
- `dynamic-loader`: Runtime module loader that reads generated config with error handling

### Modified Capabilities

- `module-federation-host`: Update to load remotes from auto-generated runtime config
- `microfrontend-sample`: Rename to follow `mfe-*` naming convention for auto-discovery

## Impact

### Affected Code

- `apps/website/vite.config.ts` - Remove hardcoded remotes, add config generation logic
- `apps/website/src/config/remotes.ts` - Rewrite to load from generated `public/remotes.config.json`
- `apps/website/src/RemoteWidgetLoader.ts` - Use dynamic loader to load any discovered remote
- `apps/remote-widget/` - Rename to `apps/mfe-widget/` to follow naming convention
- Root `package.json` - Add scripts for discovery, generation, selective builds
- `.github/workflows/` or CI config - Update to use selective build system

### New Components

- `turbo.json` - Turborepo pipeline configuration
- `packages/monorepo-tools/` - Discovery and config generation utilities
  - `src/discovery.ts` - Scan apps/ for micro-frontends
  - `src/config-generator.ts` - Generate remotes.config.json
- `packages/remote-config/` - Shared config schema and TypeScript types
- `packages/dynamic-loader/` - Runtime remote loader
- `apps/website/public/remotes.config.json` - Auto-generated at build time (gitignored)
- `scripts/generate-config.ts` - Generate config from discovered remotes

### Infrastructure

- Turborepo for monorepo task orchestration and caching
- Monorepo-aware build system using pnpm workspaces + Turborepo
- Convention over configuration (apps/mfe-\* pattern)
- Generated config committed or deployed with host
- Optional remote cache (Vercel, self-hosted, or local-only)

### Deployment Changes

- Adding new remote: Create `apps/mfe-{name}/` - no host changes needed
- Turborepo detects changed apps and builds only those (with caching)
- Host config regenerated when any remote changes
- Host only rebuilds if its own code changed (or config changed)
- CI/CD uses Turborepo remote cache for faster builds
- Deployment uses monorepo versioning (e.g., `/mfe-widget/v{commitHash}/`)
