## Why

Production micro-frontends require independent deployment and versioning to enable teams to ship features independently without coordination. The monorepo already has a working Azure Blob Storage deployment pipeline for MFEs and shells (`azure-blob-deployment-pipeline`: OIDC auth, per-env containers, immutable versioned paths, PR-based `remotes.config.prod.json` pinning), but it lacks a runtime-discoverable manifest: the shell only learns about MFE versions through a build-time config file that requires a shell rebuild/redeploy to change. This change adds a versioned `manifest.json` on top of that existing Azure infrastructure so the shell can discover MFE versions without a config PR, without introducing a second cloud provider or a parallel deployment pipeline.

## What Changes

- **Version Management**: Introduce semantic versioning for each micro-frontend with independent release cycles
- **Manifest System**: Create JSON manifest files that map MFE names to Azure Blob Storage URLs (`tssmfestorage.blob.core.windows.net/mfes-<env>/...`) and versions
- **CI/CD Extension**: Extend the existing `.github/workflows/deploy-mfes.yml` (from `azure-blob-deployment-pipeline`) with a manifest-update job, rather than authoring a new pipeline
- **Manifest Upload**: Upload `manifest.json` to the same `mfes-dev`/`mfes-prod` containers already provisioned, using the same OIDC identities — no new CDN, bucket, or credentials
- **Runtime Discovery**: Update shell application to fetch manifest at startup and dynamically load MFEs from Azure Blob Storage URLs
- **Subresource Integrity**: Add SRI hashes to manifest for security verification
- **Rollback Support**: Enable pinning specific MFE versions in manifest for instant rollbacks, reusing the immutable per-version blobs `azure-blob-deployment-pipeline` never deletes

## Capabilities

### New Capabilities

- `mfe-versioning`: Semantic versioning strategy for micro-frontends with independent release cycles
- `deployment-manifest`: JSON manifest structure mapping MFE names to Azure Blob Storage URLs, versions, and metadata
- `ci-cd-pipeline`: Extension to the existing `deploy-mfes.yml` workflow (from `azure-blob-deployment-pipeline`) adding an atomic manifest-update job after selective MFE deployment
- `cdn-deployment`: Manifest upload and versioned-asset cleanup on the existing Azure Blob Storage account (`tssmfestorage`); despite the capability name (kept for spec continuity), no separate CDN is introduced in this MVP
- `runtime-manifest-consumption`: Shell application fetches and parses manifest to load MFEs dynamically

### Modified Capabilities

- `dynamic-loader`: Add manifest-based URL resolution instead of compile-time config
- `config-generation`: Generate different configs for development (localhost) vs production (Azure Blob Storage URLs)

## Impact

**Affected Code**:

- `packages/dynamic-loader` — Add manifest fetching and parsing
- `apps/shells/website/src/config/remotes.ts` — Switch from static config to manifest-based loading (with `remotes.config.prod.json` retained as fallback until migration is proven, per task 15.9)
- `scripts/generate-config.ts` — Add production manifest generation mode
- `.github/workflows/deploy-mfes.yml` (owned by `azure-blob-deployment-pipeline`) — extended, not replaced, with a manifest-update job

**New Files**:

- `scripts/generate-manifest.ts` — Production manifest generator
- `manifest.schema.json` — JSON schema for manifest validation
- `manifest.production.json` — Production manifest (gitignored, generated)

**Infrastructure**:

- None new. Reuses the Azure Blob Storage account (`tssmfestorage`), containers (`mfes-dev`, `mfes-prod`), CORS configuration, and OIDC identities (`gha-mfe-dev`, `gha-mfe-prod`) already provisioned by `azure-blob-deployment-pipeline`.

**Breaking Changes**:

- **BREAKING**: Shell must fetch manifest at startup (adds network request to boot sequence)
- **BREAKING**: Development workflow unchanged, but production requires manifest deployment (layered on top of, not replacing, the existing `remotes.config.prod.json` deploy path during migration)
