# ADR-0009: Azure Blob Deployment Pipeline

## Status

Accepted (2026-07-30)

## Context

The MFE runtime requires a deployment mechanism that supports:

1. **Independent MFE deployments** - Each MFE deploys on its own schedule without rebuilding other MFEs
2. **Shell deployments** - Shell deploys independently and pulls latest MFE URLs via remote config
3. **Environment separation** - Dev and prod artifacts must never collide
4. **Immutable versioned artifacts** - Prod MFEs deployed at `/v1.2.3/` paths must never change
5. **No-downtime config updates** - Updating prod shell to point to new MFE version should not require shell rebuild
6. **OIDC authentication** - GitHub Actions workflows must authenticate to Azure without storing secrets
7. **CORS for browser access** - MFEs loaded cross-origin from blob storage into shell
8. **Cost efficiency** - Minimize Azure resource count while maintaining security boundaries

This ADR documents the MVP deployment pipeline using Azure Blob Storage with container-based environment separation.

## Decision

**Use Azure Blob Storage with OIDC authentication and container-based environment isolation**

### A1: Single Storage Account with Container-Based Separation (MVP)

**Decision**: Use one Azure Storage account (`tssmfestorage`) with separate containers per environment instead of separate accounts per environment.

**Containers**:

- `mfes-dev` - Dev MFE artifacts (floating pointers)
- `mfes-prod` - Prod MFE artifacts (versioned, immutable)
- `dev-shell` - Dev shell artifacts (floating pointer)
- `$web` - Prod shell artifacts (versioned + root)

**Rationale**:

- **MVP simplicity**: One account to provision, one CORS config, one billing entity
- **RBAC scoping**: Azure allows container-level role assignments (Service Principal gets `Storage Blob Data Contributor` scoped to specific containers, not account-wide)
- **URL structure**: Blob URLs naturally namespace by container (`/mfes-dev/` vs `/mfes-prod/`)

**Trade-offs**:

- Pro: Simpler to set up and reason about
- Pro: RBAC scope enforcement prevents dev identity from touching prod containers
- Con: All environments share account-level settings (CORS, lifecycle rules, metrics)
- Con: Future migration to per-env accounts would require URL rewrites in all historical `remotes.config.prod.json` files (likely coordinated with CDN migration, see A7)

### A2: Versioned MFE Paths in Prod

**Decision**: Prod MFE artifacts upload to `mfes-prod/<mfe-name>/v<semver>/` with immutable cache headers.

**Example**:

```
mfes-prod/
  mfe-widget/
    v0.1.0/
      remoteEntry.js
      assets/
    v0.2.0/
      remoteEntry.js
      assets/
```

**Rationale**:

- Supports [ADR-0008 Version Management](./0008-version-management.md) progressive migration
- Shell can pin to `v0.1.0` while testing `v0.2.0` in parallel
- Rollback = update `remotes.config.prod.json` to prior version URL (no re-deploy)
- Long-lived cache headers (`public, max-age=31536000, immutable`) safe because path never changes

**Trade-offs**:

- Pro: Version coexistence (multiple MFE versions live simultaneously)
- Pro: Instant rollback without artifact re-upload
- Con: Disk usage grows over time (mitigated by Azure lifecycle policies to delete versions >90 days old)

### A3: Floating Pointers for Dev

> **Status**: Extended by [ADR-0010 (Dev Preview Deployments)](./0010-dev-preview-deployments.md)  
> ADR-0010 adds immutable SHA paths and PR previews alongside the floating pointer behavior documented here. The floating pointer behavior itself remains unchanged.

**Decision**: Dev MFE artifacts upload to `mfes-dev/<mfe-name>/dev/` and overwrite on every push to `main`.

**Example**:

```
mfes-dev/
  mfe-widget/
    dev/
      remoteEntry.js  (always latest)
      assets/
```

**Rationale**:

- Dev shell always loads latest MFE build (no manual config updates)
- No version accumulation in dev
- `Cache-Control: no-cache, must-revalidate` ensures browsers fetch latest

**Trade-offs**:

- Pro: Instant dev feedback loop
- Pro: No config management overhead
- Con: Cannot test specific historical dev builds (mitigated by ADR-0010 immutable SHA paths)

### A4: Git Tag-Based Prod Releases

**Decision**: Prod deploys trigger only on git tags matching `<artifact-name>-v<semver>` pattern.

**Examples**:

- `mfe-widget-v1.2.0` → Deploy MFE Widget to `mfes-prod/mfe-widget/v1.2.0/`
- `website-v0.5.0` → Deploy Website Shell to `$web/v0.5.0/` and `$web/` root

**Rationale**:

- Git tags provide immutable release markers
- Tag name enforces versioning discipline
- Workflow validates tag version matches `package.json` version (fail-fast if mismatch)
- Tag-to-blob traceability (every prod blob maps to a git tag)

**Trade-offs**:

- Pro: Explicit release process (no accidental prod deploys)
- Pro: Git history = deployment history
- Con: Requires discipline (must bump `package.json` before tagging)

### A5: Asymmetric Shell Hosting (Static Website vs Raw Blob)

**Decision**: Prod shell uses Azure Blob static-website endpoint (`$web` container). Dev shell uses raw blob URL (`dev-shell` container).

**Prod shell**:

- Container: `$web` (special Azure container for static websites)
- URL: `https://tssmfestorage.z13.web.core.windows.net/` (static website endpoint)
- Behavior: Serves `index.html` for `/` requests, handles SPA routing

**Dev shell**:

- Container: `dev-shell`
- URL: `https://tssmfestorage.blob.core.windows.net/dev-shell/index.html` (raw blob URL)
- Behavior: Direct blob access (no SPA routing, acceptable for dev testing)

**Rationale**:

- Azure allows only one `$web` container per storage account (static website feature)
- Prod shell needs SPA routing and clean URLs (static website endpoint required)
- Dev shell can use raw blob URLs (developers know to access `/index.html` directly)

**Trade-offs**:

- Pro: Prod gets clean URLs and SPA routing
- Pro: Dev and prod fully isolated (different containers, different URLs)
- Con: Dev shell URL is less polished (acceptable for dev-only access)
- Con: Reinforces single-account MVP constraint (future per-env accounts would each get own `$web`)

### A6: Container-Scoped RBAC

**Decision**: Azure AD Service Principals scoped at container level, not account level.

**Identities**:

- `gha-mfe-dev`: `Storage Blob Data Contributor` on `mfes-dev`, `dev-shell` only
- `gha-mfe-prod`: `Storage Blob Data Contributor` on `mfes-prod`, `$web` only

**OIDC Federated Credentials**:

- `gha-mfe-dev` trusts: `repo:alirazatss/mfe-catalog:ref:refs/heads/main`
- `gha-mfe-prod` trusts: `repo:alirazatss/mfe-catalog:ref:refs/tags/*-v*`

**Rationale**:

- Defense in depth: Dev workflows cannot write to prod containers even if workflow misconfigured
- Prod identity only activated on git tags (OIDC subject filter)
- No secrets stored in GitHub (OIDC token exchange at runtime)

**Trade-offs**:

- Pro: Strong isolation (dev/prod identities cannot cross-contaminate)
- Pro: Audit trail (Azure activity logs show which identity touched which container)
- Con: More complex RBAC setup (two identities, eight role assignments total)

### A7: Raw Blob URLs (MVP) - CDN Deferred

**Decision**: Serve MFEs and shells directly from Azure Blob Storage URLs. Defer Azure CDN integration to post-MVP.

**Current MVP URLs**:

- MFE (prod): `https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.0/remoteEntry.js`
- Shell (prod): `https://tssmfestorage.z13.web.core.windows.net/` (static website)

**Future CDN URLs** (deferred):

- MFE (prod): `https://cdn.example.com/mfes/mfe-widget/v1.2.0/remoteEntry.js`
- Shell (prod): `https://cdn.example.com/`

**Migration Path**:

1. Provision Azure CDN endpoint pointing to `tssmfestorage`
2. Update `remotes.config.prod.json` to use CDN URLs for new MFE deployments
3. Historical MFE versions remain at blob URLs (cached, immutable, no urgency to migrate)
4. Shell redeploy picks up new `remotes.config.prod.json` with CDN URLs

**Rationale**:

- MVP unblocked: No CDN provisioning or DNS setup required for initial deployment
- CDN adds latency/caching layer but not critical for internal MVP
- Migration is non-breaking (blob URLs continue to work after CDN enabled)

**Trade-offs**:

- Pro: Faster MVP delivery
- Pro: Simpler troubleshooting (no CDN layer)
- Con: Slower global load times (no edge caching)
- Con: URL migration debt (future CDN URLs require config updates)

### A8: No Write-Once-Read-Many (WORM) for Immutability (MVP)

**Decision**: Enforce immutability via workflow logic (fail-if-exists checks) instead of Azure Blob immutability policies.

**Current enforcement**:

```bash
# Workflow preflight check
az storage blob list --prefix "mfe-widget/v1.2.0/"
if [ $? -eq 0 ]; then exit 1; fi  # Fail if version exists

# Upload with --overwrite false
az storage blob upload-batch --overwrite false
```

**Future WORM** (deferred):

- Enable Azure Blob immutability policy on `mfes-prod` container
- Policy prevents blob deletion/modification even by account owner
- Compliance benefit (regulatory environments)

**Rationale**:

- Workflow-based immutability sufficient for MVP (prevents human error, CI config errors)
- WORM adds operational complexity (cannot delete blobs even if needed)
- WORM policies are container-level (would affect all blobs in `mfes-prod`)

**Trade-offs**:

- Pro: Operational flexibility (can manually delete old versions if needed)
- Pro: Simpler setup
- Con: Does not prevent intentional/malicious blob modification by account owner
- Con: No compliance-grade immutability guarantee

## Workflows

### MFE Deployment Workflow

**Dev Deploy** (on push to `main`):

1. Trigger: Push modifies `apps/mfes/<mfe-name>/**` or shared packages
2. Build MFE
3. Authenticate via OIDC (`gha-mfe-dev` identity)
4. Upload to `mfes-dev/<mfe-name>/dev/` with `Cache-Control: no-cache, must-revalidate`
5. Dev shell auto-loads latest (no config update needed)

**Prod Deploy** (on tag `<mfe-name>-v<semver>`):

1. Trigger: Tag `mfe-widget-v1.2.0` pushed
2. Validate tag version matches `package.json` version (fail if mismatch)
3. Build MFE
4. Authenticate via OIDC (`gha-mfe-prod` identity)
5. Check if `mfes-prod/<mfe-name>/v1.2.0/` exists (fail if yes)
6. Upload to `mfes-prod/<mfe-name>/v1.2.0/` with `Cache-Control: public, max-age=31536000, immutable`
7. Open PR to update `apps/shells/website/public/remotes.config.prod.json`:
   - Branch: `bots/pin-<mfe-name>-v1.2.0`
   - Modify only `entryUrl` and `version` fields for that MFE
   - PR not auto-merged (requires human approval)

### Shell Deployment Workflow

**Dev Deploy** (on push to `main`):

1. Trigger: Push modifies `apps/shells/website/**` or shared packages
2. Build shell with `DEPLOY_ENV=dev` (bundles `remotes.config.dev.json`)
3. Authenticate via OIDC (`gha-mfe-dev` identity)
4. Upload to `dev-shell/` root with `Cache-Control: no-cache, must-revalidate`

**Prod Versioned Deploy** (on tag `website-v<semver>`):

1. Trigger: Tag `website-v0.5.0` pushed
2. Validate tag version matches `package.json` version
3. Build shell with `DEPLOY_ENV=prod` (bundles `remotes.config.prod.json`)
4. Authenticate via OIDC (`gha-mfe-prod` identity)
5. Check if `$web/v0.5.0/` exists (fail if yes)
6. Upload to `$web/v0.5.0/` with `Cache-Control: public, max-age=31536000, immutable`
7. Copy same build to `$web/` root with `Cache-Control: public, max-age=300` (overwrites)
8. Static website serves from `$web/` root

**Config-Only Redeploy** (on merge updating `remotes.config.prod.json`):

1. Trigger: Merge to `main` modifies `apps/shells/website/public/remotes.config.prod.json`
2. Build shell with `DEPLOY_ENV=prod` (bundles updated config)
3. Authenticate via OIDC (`gha-mfe-prod` identity)
4. Upload to `$web/` root only (no versioned path created)
5. Existing `$web/v*/` paths remain unchanged
6. Use case: Point prod shell to newly published MFE version without cutting new shell version

## Path Structure

```
Azure Storage Account: tssmfestorage

Container: mfes-dev
  mfe-widget/
    dev/
      remoteEntry.js
      assets/chunk-abc123.js
  mfe-landing-page/
    dev/
      remoteEntry.js
      assets/

Container: mfes-prod
  mfe-widget/
    v0.1.0/
      remoteEntry.js
      assets/
    v0.2.0/
      remoteEntry.js
      assets/
  mfe-landing-page/
    v0.1.0/
      remoteEntry.js
      assets/

Container: dev-shell
  index.html
  assets/
  remotes.config.json  (contains remotes.config.dev.json contents)

Container: $web (static website)
  v0.5.0/
    index.html
    assets/
    remotes.config.json  (contains remotes.config.prod.json contents)
  v0.6.0/
    index.html
    assets/
    remotes.config.json
  index.html  (root copy, served by static website)
  assets/
  remotes.config.json
```

## Environment-Specific Configs

**Source files** (both committed):

- `apps/shells/website/public/remotes.config.dev.json` - Dev MFE URLs (floating pointers)
- `apps/shells/website/public/remotes.config.prod.json` - Prod MFE URLs (versioned)

**Build-time selection** (vite.config.ts):

- `DEPLOY_ENV=dev` → Copy `remotes.config.dev.json` to `dist/remotes.config.json`
- `DEPLOY_ENV=prod` → Copy `remotes.config.prod.json` to `dist/remotes.config.json`

**Dev config** (`remotes.config.dev.json`):

```json
{
  "features": {
    "/widget": {
      "entryUrl": "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/dev/remoteEntry.js"
    }
  }
}
```

**Prod config** (`remotes.config.prod.json`):

```json
{
  "features": {
    "/widget": {
      "entryUrl": "https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.0/remoteEntry.js",
      "version": "1.2.0"
    }
  }
}
```

## Security

### OIDC Authentication (No Secrets)

**GitHub Actions workflow**:

```yaml
permissions:
  id-token: write  # Required for OIDC token
  contents: read
  pull-requests: write

- uses: azure/login@v2
  with:
    client-id: ${{ vars.AZURE_CLIENT_ID_PROD }}
    tenant-id: ${{ vars.AZURE_TENANT_ID }}
    subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
    # No client-secret required (OIDC token exchange)
```

**GitHub Repository Variables** (public, not secrets):

- `AZURE_CLIENT_ID_DEV` - Service Principal for dev
- `AZURE_CLIENT_ID_PROD` - Service Principal for prod
- `AZURE_TENANT_ID` - Azure AD tenant
- `AZURE_SUBSCRIPTION_ID` - Azure subscription

**Zero GitHub Secrets** - No `AZURE_CLIENT_SECRET` or access keys stored

### CORS Configuration

**Applied at storage account level**:

```json
{
  "CorsRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposedHeaders": ["*"],
      "MaxAgeInSeconds": 3600
    }
  ]
}
```

**Rationale**: Shell loads MFEs cross-origin from blob storage

## Technical Debt & Future Work

### 1. CDN Migration (A7)

**Current**: Raw blob URLs  
**Future**: Azure CDN with custom domain

**Migration steps**:

1. Provision Azure CDN endpoint → `cdn.example.com`
2. Update new MFE deploys to write `remotes.config.prod.json` with CDN URLs
3. Shell redeploy picks up CDN URLs
4. Historical MFE versions remain at blob URLs (cached, no urgency)

**Complexity**: Medium (requires DNS, CDN config, URL migration strategy)

### 2. WORM Immutability (A8)

**Current**: Workflow-enforced immutability (fail-if-exists checks)  
**Future**: Azure Blob immutability policies (write-once-read-many)

**Migration steps**:

1. Enable immutability policy on `mfes-prod` container
2. Test delete prevention
3. Update runbook with WORM operations

**Complexity**: Low (policy config only)

### 3. Per-Environment Storage Accounts (A1)

**Current**: Single account `tssmfestorage` with container separation  
**Future**: `tssmfestorage-dev` and `tssmfestorage-prod` accounts

**Migration steps**:

1. Provision separate accounts
2. Update RBAC (identity per account)
3. Rewrite all historical `remotes.config.prod.json` URLs (likely coordinated with CDN migration)
4. Update workflows

**Complexity**: High (URL rewrite cascade, historical config updates)  
**Recommendation**: Combine with CDN migration to minimize URL churn

### 4. Dev Shell Static Website (A5)

**Current**: Dev shell at raw blob URL (`dev-shell/index.html`)  
**Future**: Per-environment accounts would each get own `$web` container

**Migration**: Deferred until per-env accounts (see #3)

**Complexity**: Low (depends on #3)

## Cross-References

- [ADR-0008: Version Management](./0008-version-management.md) - Complementary (this ADR handles deployment mechanics; ADR-0008 handles version compatibility strategy)
- `docs/runbooks/azure-blob-provisioning.md` - Operational runbook for infrastructure setup
- `CONTEXT.md` - Overall system context (updated to reflect Azure Blob instead of illustrative AWS S3)

## Consequences

### Positive

1. **Independent deployments** - MFEs and shells deploy on independent schedules
2. **Instant rollback** - Update config to prior version URL (no re-deploy)
3. **No secrets** - OIDC authentication eliminates secret sprawl
4. **Environment isolation** - Container-scoped RBAC prevents cross-contamination
5. **Version coexistence** - Multiple MFE versions live simultaneously (supports progressive migration)
6. **Config-only updates** - Update shell to point to new MFE version without rebuilding shell

### Negative

1. **Raw blob URLs** - No CDN edge caching (deferred to post-MVP)
2. **Single account constraints** - All environments share account-level settings
3. **Dev shell URL** - Less polished than prod (raw blob URL instead of static website)
4. **URL migration debt** - Future CDN or per-env account migration requires URL rewrites
5. **No WORM enforcement** - Immutability relies on workflow logic, not Azure policy

### Neutral

1. **Azure-specific** - Deployment pipeline tied to Azure Blob Storage (acceptable for MVP)
2. **Manual version bumps** - Must bump `package.json` before tagging (enforced by workflow validation)
3. **PR approval required** - Config updates not auto-merged (deliberate safety gate)
