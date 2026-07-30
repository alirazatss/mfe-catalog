# Azure Blob Storage Provisioning Runbook

**Change**: `azure-blob-deployment-pipeline`  
**Purpose**: Provision Azure infrastructure for hosting MFE and shell artifacts with OIDC-authenticated GitHub Actions workflows  
**Owner**: Platform Team  
**Last Updated**: 2026-07-30

## Overview

This runbook provisions a single Azure Blob Storage account (`tssmfestorage`) with container-based environment separation and GitHub Actions OIDC authentication. No secrets are stored; all authentication uses federated identity credentials.

**Architecture Summary:**
- **Single storage account**: `tssmfestorage`
- **Containers**: `mfes-dev`, `mfes-prod`, `dev-shell`, `$web`
- **OIDC Identities**: `gha-mfe-dev` (container-scoped to dev), `gha-mfe-prod` (container-scoped to prod)
- **Federated Credentials**: Dev trusts `main` branch, Prod trusts `*-v*` tags only

## Prerequisites

- Azure CLI installed and authenticated (`az login`)
- Permissions to create storage accounts, Azure AD applications, and role assignments
- Target Azure subscription ID
- GitHub repository: `alirazatss/mfe-catalog` (adjust for your org/repo)

## Environment Variables

Set these before running commands:

```bash
# Azure Configuration
export AZURE_SUBSCRIPTION_ID="<your-subscription-id>"
export AZURE_RESOURCE_GROUP="mfe-catalog-rg"
export AZURE_LOCATION="westeurope"
export STORAGE_ACCOUNT_NAME="tssmfestorage"

# GitHub Configuration
export GITHUB_ORG="alirazatss"
export GITHUB_REPO="mfe-catalog"
```

---

## Task 1.1: Provision Storage Account and Containers

### Implements
- **ABL-Requirement-1**: Single account, container-based separation
- **ABL-Requirement-2**: MFE path structure
- **ABL-Requirement-3**: `$web` prod + `dev-shell` dev
- **ABL-Requirement-4**: CORS configuration

### Steps

#### 1.1.1 Create Resource Group (if not exists)

```bash
az group create \
  --name "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION"
```

**Expected Output:**
```json
{
  "id": "/subscriptions/<sub-id>/resourceGroups/mfe-catalog-rg",
  "location": "westeurope",
  "name": "mfe-catalog-rg",
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

#### 1.1.2 Create Storage Account

```bash
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true
```

**Expected Output:**
```json
{
  "name": "tssmfestorage",
  "provisioningState": "Succeeded",
  "primaryLocation": "westeurope"
}
```

#### 1.1.3 Enable Static Website Hosting

This automatically creates the `$web` container.

```bash
az storage blob service-properties update \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --static-website \
  --index-document index.html \
  --404-document index.html
```

**Expected Output:**
```json
{
  "staticWebsite": {
    "enabled": true,
    "indexDocument": "index.html",
    "errorDocument404Path": "index.html"
  }
}
```

#### 1.1.4 Create Additional Containers

```bash
# Create mfes-dev container
az storage container create \
  --name "mfes-dev" \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --public-access blob

# Create mfes-prod container
az storage container create \
  --name "mfes-prod" \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --public-access blob

# Create dev-shell container
az storage container create \
  --name "dev-shell" \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --public-access blob
```

**Expected Output (for each):**
```json
{
  "created": true
}
```

#### 1.1.5 Configure CORS

Configure CORS at the storage account level to allow cross-origin requests from any origin.

```bash
az storage cors add \
  --services b \
  --methods GET OPTIONS \
  --origins '*' \
  --allowed-headers '*' \
  --exposed-headers '*' \
  --max-age 3600 \
  --account-name "$STORAGE_ACCOUNT_NAME"
```

### Verification for Task 1.1

```bash
# Verify storage account exists with static website enabled
az storage account show --name "$STORAGE_ACCOUNT_NAME" \
  --query "{name:name,staticWebsite:enableStaticWebsite}" -o json

# Expected: {"name": "tssmfestorage", "staticWebsite": true}

# Verify all containers exist
az storage container list --account-name "$STORAGE_ACCOUNT_NAME" \
  --query "[].name" -o tsv | sort

# Expected output (sorted):
# $web
# dev-shell
# mfes-dev
# mfes-prod

# Verify CORS configuration
az storage cors list --services b --account-name "$STORAGE_ACCOUNT_NAME" -o json

# Expected output contains:
# {
#   "CorsRule": [
#     {
#       "AllowedOrigins": ["*"],
#       "AllowedMethods": ["GET", "OPTIONS"],
#       "MaxAgeInSeconds": 3600
#     }
#   ]
# }
```

---

## Task 1.2: Create Azure AD Applications with Container-Scoped RBAC

### Implements
- **OIDC-Requirement-2**: One identity per env, container-scoped RBAC

### Steps

#### 1.2.1 Create Azure AD Application for Dev

```bash
az ad app create --display-name "gha-mfe-dev"
```

**Capture Output:**
```bash
export DEV_APP_ID=$(az ad app list --display-name "gha-mfe-dev" --query "[0].appId" -o tsv)
export DEV_OBJECT_ID=$(az ad sp list --display-name "gha-mfe-dev" --query "[0].id" -o tsv)

# If service principal doesn't exist, create it
if [ -z "$DEV_OBJECT_ID" ]; then
  az ad sp create --id "$DEV_APP_ID"
  export DEV_OBJECT_ID=$(az ad sp list --display-name "gha-mfe-dev" --query "[0].id" -o tsv)
fi

echo "Dev App ID: $DEV_APP_ID"
echo "Dev Object ID: $DEV_OBJECT_ID"
```

#### 1.2.2 Create Azure AD Application for Prod

```bash
az ad app create --display-name "gha-mfe-prod"
```

**Capture Output:**
```bash
export PROD_APP_ID=$(az ad app list --display-name "gha-mfe-prod" --query "[0].appId" -o tsv)
export PROD_OBJECT_ID=$(az ad sp list --display-name "gha-mfe-prod" --query "[0].id" -o tsv)

# If service principal doesn't exist, create it
if [ -z "$PROD_OBJECT_ID" ]; then
  az ad sp create --id "$PROD_APP_ID"
  export PROD_OBJECT_ID=$(az ad sp list --display-name "gha-mfe-prod" --query "[0].id" -o tsv)
fi

echo "Prod App ID: $PROD_APP_ID"
echo "Prod Object ID: $PROD_OBJECT_ID"
```

#### 1.2.3 Get Storage Account Resource ID and Container Scope IDs

```bash
# Storage account resource ID
export STORAGE_RESOURCE_ID=$(az storage account show \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query "id" -o tsv)

echo "Storage Resource ID: $STORAGE_RESOURCE_ID"

# Container scope IDs (container-level, not account-level)
export MFES_DEV_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/mfes-dev"
export MFES_PROD_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/mfes-prod"
export DEV_SHELL_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/dev-shell"
export WEB_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/\$web"

echo "Container Scopes:"
echo "  mfes-dev: $MFES_DEV_SCOPE"
echo "  mfes-prod: $MFES_PROD_SCOPE"
echo "  dev-shell: $DEV_SHELL_SCOPE"
echo "  \$web: $WEB_SCOPE"
```

#### 1.2.4 Assign Container-Scoped RBAC for Dev Identity

Assign `Storage Blob Data Contributor` role scoped **only** to `mfes-dev` and `dev-shell` containers.

```bash
# Assign to mfes-dev container
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "$DEV_APP_ID" \
  --scope "$MFES_DEV_SCOPE"

# Assign to dev-shell container
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "$DEV_APP_ID" \
  --scope "$DEV_SHELL_SCOPE"
```

#### 1.2.5 Assign Container-Scoped RBAC for Prod Identity

Assign `Storage Blob Data Contributor` role scoped **only** to `mfes-prod` and `$web` containers.

```bash
# Assign to mfes-prod container
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "$PROD_APP_ID" \
  --scope "$MFES_PROD_SCOPE"

# Assign to $web container
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee "$PROD_APP_ID" \
  --scope "$WEB_SCOPE"
```

### Verification for Task 1.2

**Critical**: Verify that role assignments are **container-scoped**, not account-scoped.

```bash
# Verify dev identity has exactly 2 container-scoped assignments
echo "=== Dev Identity Role Assignments ==="
az role assignment list --assignee "$DEV_APP_ID" --all -o json | \
  jq -r '.[] | "\(.roleDefinitionName): \(.scope)"'

# Expected output:
# Storage Blob Data Contributor: /subscriptions/.../containers/mfes-dev
# Storage Blob Data Contributor: /subscriptions/.../containers/dev-shell

# Verify prod identity has exactly 2 container-scoped assignments
echo "=== Prod Identity Role Assignments ==="
az role assignment list --assignee "$PROD_APP_ID" --all -o json | \
  jq -r '.[] | "\(.roleDefinitionName): \(.scope)"'

# Expected output:
# Storage Blob Data Contributor: /subscriptions/.../containers/mfes-prod
# Storage Blob Data Contributor: /subscriptions/.../containers/$web

# Verify NO account-level assignments exist
echo "=== Checking for Account-Level Assignments (should be empty) ==="
az role assignment list --assignee "$DEV_APP_ID" --all -o json | \
  jq -r '.[] | select(.scope == "'$STORAGE_RESOURCE_ID'") | .scope'

az role assignment list --assignee "$PROD_APP_ID" --all -o json | \
  jq -r '.[] | select(.scope == "'$STORAGE_RESOURCE_ID'") | .scope'

# Expected: (no output - no account-level assignments)

# Verify no cross-environment access
echo "=== Verify Dev has NO access to prod containers ==="
az role assignment list --assignee "$DEV_APP_ID" --all -o json | \
  jq -r '.[] | select(.scope | contains("mfes-prod") or contains("$web"))'

# Expected: (no output)

echo "=== Verify Prod has NO access to dev containers ==="
az role assignment list --assignee "$PROD_APP_ID" --all -o json | \
  jq -r '.[] | select(.scope | contains("mfes-dev") or contains("dev-shell"))'

# Expected: (no output)
```

---

## Task 1.3: Add Federated Credentials

### Implements
- **OIDC-Requirement-3**: Prod tag-only trust
- **OIDC-Requirement-4**: Dev main-only trust

### Steps

#### 1.3.1 Add Federated Credential for Dev (Main Branch Only)

```bash
az ad app federated-credential create \
  --id "$DEV_APP_ID" \
  --parameters '{
    "name": "gha-mfe-dev-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$GITHUB_ORG"'/'"$GITHUB_REPO"':ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

**Expected Output:**
```json
{
  "name": "gha-mfe-dev-main",
  "subject": "repo:alirazatss/mfe-catalog:ref:refs/heads/main",
  "issuer": "https://token.actions.githubusercontent.com"
}
```

#### 1.3.2 Add Federated Credential for Prod (Tags Matching `*-v*`)

```bash
az ad app federated-credential create \
  --id "$PROD_APP_ID" \
  --parameters '{
    "name": "gha-mfe-prod-tags",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$GITHUB_ORG"'/'"$GITHUB_REPO"':ref:refs/tags/*-v*",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

**Expected Output:**
```json
{
  "name": "gha-mfe-prod-tags",
  "subject": "repo:alirazatss/mfe-catalog:ref:refs/tags/*-v*",
  "issuer": "https://token.actions.githubusercontent.com"
}
```

### Verification for Task 1.3

```bash
# List federated credentials for dev app
echo "=== Dev Federated Credentials ==="
az ad app federated-credential list --id "$DEV_APP_ID" -o json | \
  jq -r '.[] | {name, subject, issuer}'

# Expected:
# {
#   "name": "gha-mfe-dev-main",
#   "subject": "repo:alirazatss/mfe-catalog:ref:refs/heads/main",
#   "issuer": "https://token.actions.githubusercontent.com"
# }

# List federated credentials for prod app
echo "=== Prod Federated Credentials ==="
az ad app federated-credential list --id "$PROD_APP_ID" -o json | \
  jq -r '.[] | {name, subject, issuer}'

# Expected:
# {
#   "name": "gha-mfe-prod-tags",
#   "subject": "repo:alirazatss/mfe-catalog:ref:refs/tags/*-v*",
#   "issuer": "https://token.actions.githubusercontent.com"
# }
```

#### Test Token Exchange (Manual Verification)

To verify that prod credentials reject non-tag refs, you can create a throwaway test workflow that attempts `azure/login` from a feature branch using prod credentials. It should fail at token exchange. This test is optional but recommended.

---

## Task 1.4: GitHub Repository Variables

### Implements
- **OIDC-Requirement-1**: No secrets stored

Add these values as **repository variables** (not secrets) in GitHub:

### Dev Environment Variables

```bash
echo "Add these as GitHub repository variables (Settings → Secrets and variables → Actions → Variables):"
echo ""
echo "AZURE_CLIENT_ID_DEV=$DEV_APP_ID"
echo "AZURE_TENANT_ID=$AZURE_TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID"
```

Get tenant ID if not already set:

```bash
export AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)
```

### Prod Environment Variables

```bash
echo ""
echo "AZURE_CLIENT_ID_PROD=$PROD_APP_ID"
echo "AZURE_TENANT_ID=$AZURE_TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID=$AZURE_SUBSCRIPTION_ID"
```

### Add via GitHub CLI

```bash
# Add dev variables
gh variable set AZURE_CLIENT_ID_DEV --body "$DEV_APP_ID"
gh variable set AZURE_TENANT_ID --body "$AZURE_TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --body "$AZURE_SUBSCRIPTION_ID"

# Add prod variable (tenant and subscription are shared)
gh variable set AZURE_CLIENT_ID_PROD --body "$PROD_APP_ID"
```

### Verification

```bash
# List all repository variables
gh variable list

# Verify NO secrets related to Azure credentials exist
gh secret list | grep -i azure

# Expected: (no output - no Azure secrets should exist)
```

**Important**: Confirm that **zero** secret names like `AZURE_STORAGE_KEY`, `AZURE_CONNECTION_STRING`, `AZURE_SAS_TOKEN`, or `AZURE_CLIENT_SECRET` exist.

---

## Activity Log Alert for Prod Blob Deletions

Set up an activity log alert to monitor delete operations on prod containers.

```bash
# Create action group (notification target)
az monitor action-group create \
  --name "mfe-prod-delete-alert" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --short-name "mfe-delete" \
  --email-receiver admin-email alerts@example.com

# Create activity log alert for blob deletions in mfes-prod and $web
az monitor activity-log alert create \
  --name "mfe-prod-blob-delete-alert" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --condition category=Administrative and operationName=Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete and resourceId=$STORAGE_RESOURCE_ID \
  --scope "$STORAGE_RESOURCE_ID" \
  --action-group "mfe-prod-delete-alert" \
  --description "Alert on blob deletions in prod containers (mfes-prod, \$web)"
```

### Verification

```bash
# List activity log alerts
az monitor activity-log alert list --resource-group "$AZURE_RESOURCE_GROUP" -o table

# Expected output includes:
# Name                          ResourceGroup    Condition
# mfe-prod-blob-delete-alert    mfe-catalog-rg   category=Administrative and operationName=...delete
```

---

## Summary of Created Resources

### Azure Storage Account

- **Name**: `tssmfestorage`
- **Containers**: `mfes-dev`, `mfes-prod`, `dev-shell`, `$web`
- **CORS**: Enabled for GET/OPTIONS from `*` with 3600s max-age
- **Static Website**: Enabled on `$web` container

### Azure AD Applications

| Application      | Client ID              | Container Assignments      | Federated Credential Subject                                  |
| ---------------- | ---------------------- | -------------------------- | ------------------------------------------------------------- |
| `gha-mfe-dev`    | `$DEV_APP_ID`          | `mfes-dev`, `dev-shell`    | `repo:alirazatss/mfe-catalog:ref:refs/heads/main`            |
| `gha-mfe-prod`   | `$PROD_APP_ID`         | `mfes-prod`, `$web`        | `repo:alirazatss/mfe-catalog:ref:refs/tags/*-v*`             |

### GitHub Repository Variables (Non-Secret)

- `AZURE_CLIENT_ID_DEV`
- `AZURE_CLIENT_ID_PROD`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

**Zero secrets stored.** All authentication via OIDC.

---

## Rollback Steps

### Delete Federated Credentials

```bash
az ad app federated-credential delete --id "$DEV_APP_ID" --federated-credential-id "gha-mfe-dev-main"
az ad app federated-credential delete --id "$PROD_APP_ID" --federated-credential-id "gha-mfe-prod-tags"
```

### Delete Role Assignments

```bash
# Dev
az role assignment delete --assignee "$DEV_APP_ID" --scope "$MFES_DEV_SCOPE"
az role assignment delete --assignee "$DEV_APP_ID" --scope "$DEV_SHELL_SCOPE"

# Prod
az role assignment delete --assignee "$PROD_APP_ID" --scope "$MFES_PROD_SCOPE"
az role assignment delete --assignee "$PROD_APP_ID" --scope "$WEB_SCOPE"
```

### Delete Azure AD Applications

```bash
az ad app delete --id "$DEV_APP_ID"
az ad app delete --id "$PROD_APP_ID"
```

### Delete Storage Account

```bash
az storage account delete --name "$STORAGE_ACCOUNT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --yes
```

### Delete Resource Group (if no other resources)

```bash
az group delete --name "$AZURE_RESOURCE_GROUP" --yes --no-wait
```

---

## Future Environment Addition Example

To add a new `sst` environment following this pattern:

1. **Create Containers**:
   ```bash
   az storage container create --name "mfes-sst" --account-name "$STORAGE_ACCOUNT_NAME" --public-access blob
   az storage container create --name "sst-shell" --account-name "$STORAGE_ACCOUNT_NAME" --public-access blob
   ```

2. **Create Azure AD App**:
   ```bash
   az ad app create --display-name "gha-mfe-sst"
   export SST_APP_ID=$(az ad app list --display-name "gha-mfe-sst" --query "[0].appId" -o tsv)
   az ad sp create --id "$SST_APP_ID"
   ```

3. **Assign Container-Scoped RBAC**:
   ```bash
   export MFES_SST_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/mfes-sst"
   export SST_SHELL_SCOPE="${STORAGE_RESOURCE_ID}/blobServices/default/containers/sst-shell"
   
   az role assignment create --role "Storage Blob Data Contributor" --assignee "$SST_APP_ID" --scope "$MFES_SST_SCOPE"
   az role assignment create --role "Storage Blob Data Contributor" --assignee "$SST_APP_ID" --scope "$SST_SHELL_SCOPE"
   ```

4. **Add Federated Credential** (adjust subject as needed):
   ```bash
   az ad app federated-credential create --id "$SST_APP_ID" --parameters '{
     "name": "gha-mfe-sst-main",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:'"$GITHUB_ORG"'/'"$GITHUB_REPO"':environment:sst",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

5. **Add GitHub Variable**:
   ```bash
   gh variable set AZURE_CLIENT_ID_SST --body "$SST_APP_ID"
   ```

6. **Copy Workflow Jobs**: Duplicate existing dev/prod workflow jobs and adjust container references.

**No existing containers, blobs, or workflows require modification.**

---

## Troubleshooting

### CORS Errors

If browsers report CORS errors when fetching remote entries:

```bash
# Verify CORS is set correctly
az storage cors list --services b --account-name "$STORAGE_ACCOUNT_NAME"

# Re-apply if needed
az storage cors clear --services b --account-name "$STORAGE_ACCOUNT_NAME"
az storage cors add --services b --methods GET OPTIONS --origins '*' --allowed-headers '*' --exposed-headers '*' --max-age 3600 --account-name "$STORAGE_ACCOUNT_NAME"
```

### OIDC Token Exchange Failures

If workflows fail at `azure/login`:

1. **Verify federated credential subject** matches the GitHub ref pattern:
   ```bash
   az ad app federated-credential list --id "$PROD_APP_ID"
   ```

2. **Check workflow has** `permissions: id-token: write`

3. **Verify repository variables** are set correctly:
   ```bash
   gh variable list
   ```

### RBAC Permission Denied

If workflows fail with "permission denied" when uploading blobs:

1. **Verify role assignments are container-scoped**:
   ```bash
   az role assignment list --assignee "$DEV_APP_ID" --all
   ```

2. **Check scope ends in `/containers/<container-name>`**, not the storage account resource ID

3. **Re-assign if needed** (see Task 1.2 steps)

---

## References

- OpenSpec Change: `openspec/changes/azure-blob-deployment-pipeline/`
- Requirements:
  - `ABL-Requirement-1` through `ABL-Requirement-5` (azure-blob-storage-layout/spec.md)
  - `OIDC-Requirement-1` through `OIDC-Requirement-4` (github-actions-azure-oidc/spec.md)

---

**End of Runbook**
