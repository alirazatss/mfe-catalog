## Why

Production micro-frontends require independent deployment and versioning to enable teams to ship features independently without coordination. Currently, the monorepo lacks production deployment infrastructure: no versioning strategy, no CDN deployment pipeline, no manifest system for the shell to discover MFE versions at runtime. This blocks production readiness and prevents true micro-frontend autonomy.

## What Changes

- **Version Management**: Introduce semantic versioning for each micro-frontend with independent release cycles
- **Manifest System**: Create JSON manifest files that map MFE names to CDN URLs and versions
- **CI/CD Pipeline**: Implement GitHub Actions workflow that detects changed MFEs (via Turborepo) and deploys only updated packages
- **CDN Deployment**: Configure build artifacts to be deployed to CDN with versioned paths (e.g., `/mfe-widget/1.2.3/remoteEntry.js`)
- **Runtime Discovery**: Update shell application to fetch manifest at startup and dynamically load MFEs from CDN URLs
- **Subresource Integrity**: Add SRI hashes to manifest for security verification
- **Rollback Support**: Enable pinning specific MFE versions in manifest for instant rollbacks

## Capabilities

### New Capabilities

- `mfe-versioning`: Semantic versioning strategy for micro-frontends with independent release cycles
- `deployment-manifest`: JSON manifest structure mapping MFE names to CDN URLs, versions, and metadata
- `ci-cd-pipeline`: GitHub Actions workflow for selective MFE deployment based on Turborepo change detection
- `cdn-deployment`: CDN upload and versioned asset management for micro-frontend bundles
- `runtime-manifest-consumption`: Shell application fetches and parses manifest to load MFEs dynamically

### Modified Capabilities

- `dynamic-loader`: Add manifest-based URL resolution instead of compile-time config
- `config-generation`: Generate different configs for development (localhost) vs production (CDN URLs)

## Impact

**Affected Code**:

- `packages/dynamic-loader` — Add manifest fetching and parsing
- `apps/shells/website/src/config/remotes.ts` — Switch from static config to manifest-based loading
- `scripts/generate-config.ts` — Add production manifest generation mode

**New Files**:

- `.github/workflows/deploy-mfes.yml` — CI/CD pipeline for MFE deployment
- `scripts/generate-manifest.ts` — Production manifest generator
- `scripts/deploy-to-cdn.ts` — CDN upload script
- `manifest.schema.json` — JSON schema for manifest validation
- `manifest.production.json` — Production manifest (gitignored, generated)

**Infrastructure**:

- CDN configuration (e.g., AWS CloudFront, Cloudflare, Netlify)
- GitHub Actions secrets for CDN credentials

**Breaking Changes**:

- **BREAKING**: Shell must fetch manifest at startup (adds network request to boot sequence)
- **BREAKING**: Development workflow unchanged, but production requires manifest deployment
