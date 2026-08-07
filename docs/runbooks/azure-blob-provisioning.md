# Azure Blob Storage Provisioning Runbook

This runbook covers Azure Blob Storage configuration for the MF Mono deployment infrastructure.

## Storage Account

- **Account**: `tssmfestorage`
- **Subscription**: (from `AZURE_SUBSCRIPTION_ID` variable)
- **Tenant**: (from `AZURE_TENANT_ID` variable)

## Containers

### `dev-shell` (Development Shells)

**Purpose**: Hosts development builds of shell applications.

**Path Structure**:

- Per-shell floating pointer: `<shell-name>/` (e.g., `website/`, `ccis/`)
- Immutable SHA paths: `<shell-name>/sha-<short8>/`
- PR preview paths: `<shell-name>/pr-<number>/`
- Release channel paths: `<shell-name>/release-<major.minor>/` (e.g., `website/release-4.10/`)
- Release channel SHA paths: `<shell-name>/release-<major.minor>/sha-<short8>/`

**Cache-Control**:

- Floating pointers: `no-cache, must-revalidate`
- SHA paths: `public, max-age=31536000, immutable`

**Examples**:

- `dev-shell/website/index.html` - Latest dev build (main branch)
- `dev-shell/website/sha-a1b2c3d4/index.html` - Immutable commit-specific build
- `dev-shell/website/pr-42/index.html` - PR preview
- `dev-shell/website/release-4.10/index.html` - Release 4.10 channel build
- `dev-shell/website/release-4.10/sha-a1b2c3d4/index.html` - Immutable build in release channel

### `$web` (Production Shells)

**Purpose**: Static website hosting for production shell builds.

**Path Structure**:

- Per-shell floating pointer: `<shell-name>/` (e.g., `website/`, `ccis/`)
- Versioned releases: `<shell-name>/v<semver>/`

**Cache-Control**:

- Floating pointers: `public, max-age=300`
- Versioned releases: `public, max-age=31536000, immutable`

**Examples**:

- `$web/website/index.html` - Latest prod release
- `$web/website/v1.2.0/index.html` - Immutable versioned release

**Static Website URL**: `https://tssmfestorage.z13.web.core.windows.net/<shell-name>/`

## Lifecycle Management Policy

Azure Storage lifecycle policies automatically delete stale artifacts.

### Rules

**Rule 1: Delete stale PR previews (14 days)**

```json
{
  "name": "delete-pr-previews",
  "enabled": true,
  "type": "Lifecycle",
  "definition": {
    "filters": {
      "blobTypes": ["blockBlob"],
      "prefixMatch": ["dev-shell/website/pr-", "dev-shell/ccis/pr-"]
    },
    "actions": {
      "baseBlob": {
        "delete": {
          "daysAfterModificationGreaterThan": 14
        }
      }
    }
  }
}
```

**Rule 2: Delete old SHA artifacts (30 days)**

```json
{
  "name": "delete-old-sha-artifacts",
  "enabled": true,
  "type": "Lifecycle",
  "definition": {
    "filters": {
      "blobTypes": ["blockBlob"],
      "prefixMatch": ["dev-shell/website/sha-", "dev-shell/ccis/sha-"]
    },
    "actions": {
      "baseBlob": {
        "delete": {
          "daysAfterModificationGreaterThan": 30
        }
      }
    }
  }
}
```

**Rule 3: Delete old release channel builds (90 days)**

```json
{
  "name": "delete-release-channels-after-90-days",
  "enabled": true,
  "type": "Lifecycle",
  "definition": {
    "filters": {
      "blobTypes": ["blockBlob"],
      "prefixMatch": ["mfes-dev/*/release-", "dev-shell/*/release-"]
    },
    "actions": {
      "baseBlob": {
        "delete": {
          "daysAfterModificationGreaterThan": 90
        }
      }
    }
  }
}
```

**Important**: When adding a new shell, update all rules with new prefix entries:

- `dev-shell/<new-shell>/pr-`
- `dev-shell/<new-shell>/sha-`
- Release channel prefixes use wildcards and don't require per-shell updates

**Exclusions**: The following paths are NEVER deleted by lifecycle policies:

- Floating dev pointers: `<shell>/` (no prefix match)
- Production builds: `$web/<shell>/` (different container)
- Active release channels (within 90 days of last modification)

### Policy Verification

```bash
# List all lifecycle policies
az storage account management-policy show \
  --account-name tssmfestorage \
  --resource-group <resource-group>

# Test: List blobs that would be deleted (older than 14 days)
az storage blob list \
  --account-name tssmfestorage \
  --container-name dev-shell \
  --prefix "website/pr-" \
  --auth-mode login \
  --query "[?properties.lastModified < '$(date -u -d '14 days ago' +%Y-%m-%dT%H:%M:%SZ)'].name"
```

## Shell Migration to Per-Shell Prefixes (Completed for `website`)

The `website` shell was migrated from container roots to per-shell prefixes.

**Migration checklist**:

- [x] Update `deploy-shell.yml` to use per-shell destinations
- [x] Update lifecycle policies with shell-specific prefixes
- [ ] Audit external consumers of root URLs (if any exist)
- [ ] Grace period: Dual-publish to root + prefix (if migration is needed)
- [ ] After grace period: Delete root blobs
- [ ] Verify no shell blobs remain at container roots

### External Consumer Audit (Task 2.4)

**Containers to audit**: `$web`, `dev-shell`

**Audit procedure**:

```bash
# List all blobs at $web root (excluding shell prefixes)
az storage blob list \
  --account-name tssmfestorage \
  --container-name '$web' \
  --auth-mode login \
  --query "[?!starts_with(name, 'website/') && !starts_with(name, 'ccis/')].name"

# List all blobs at dev-shell root (excluding shell prefixes)
az storage blob list \
  --account-name tssmfestorage \
  --container-name dev-shell \
  --auth-mode login \
  --query "[?!starts_with(name, 'website/') && !starts_with(name, 'ccis/')].name"
```

**Findings**: (To be documented during audit - Task 2.4)

### Root Blob Cleanup (Task 2.5)

After grace period and external consumer migration:

```bash
# Delete root shell blobs from dev-shell (if any exist)
az storage blob delete-batch \
  --account-name tssmfestorage \
  --source dev-shell \
  --pattern "*.html" \
  --pattern "*.js" \
  --pattern "*.css" \
  --pattern "*.json" \
  --auth-mode login

# Verify no shell blobs remain at root
az storage blob list \
  --account-name tssmfestorage \
  --container-name dev-shell \
  --auth-mode login \
  --query "[?!contains(name, '/')].name"
```

## Adding a New Shell

1. **Create caller workflow** (`.github/workflows/deploy-<shell>.yml`):

   ```yaml
   uses: ./.github/workflows/deploy-shell.yml
   with:
     shell-name: <shell>
     shell-path: apps/shells/<shell>
     package-name: <shell>
     tag-prefix: <shell>-v
   secrets: inherit
   ```

2. **Update lifecycle policies** (add prefixes):
   - `dev-shell/<shell>/pr-` to PR deletion rule
   - `dev-shell/<shell>/sha-` to SHA deletion rule

3. **Verify deployment**:
   - Dev: `https://tssmfestorage.blob.core.windows.net/dev-shell/<shell>/index.html`
   - Prod: `https://tssmfestorage.z13.web.core.windows.net/<shell>/`

## RBAC & OIDC

**Service Principal**: (from `AZURE_CLIENT_ID_DEV` / `AZURE_CLIENT_ID_PROD`)

**Required Permissions**:

- `Storage Blob Data Contributor` on `tssmfestorage` (dev)
- `Storage Blob Data Contributor` on `tssmfestorage` (prod)

**GitHub OIDC Configuration**: Federated credential allows GitHub Actions workflows to authenticate via workload identity federation without storing secrets.
