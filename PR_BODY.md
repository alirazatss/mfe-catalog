# Task Group 2: Shell Dev Pipeline

## Implementation Summary

Implemented all tasks from task group 2 of the dev-preview-deployments change.

### Task 2.1: ✅ SHA-path uploads added

**Requirements**: SDP-A1, ABL-A1  
**Changes**:

- Added "Upload to SHA path (immutable)" step to deploy-dev job
- Uploads to `dev-shell/sha-<short8>/` with `Cache-Control: public, max-age=31536000, immutable`
- Uses `--if-none-match "*"` for conditional upload (fail-if-exists semantics)
- Tolerates BlobAlreadyExists on workflow re-run (exit 0 if already exists)

**Files**: .github/workflows/deploy-website.yml

### Task 2.2: ✅ build-info.json generation added

**Requirements**: SDP-A2  
**Changes**:

- Added "Generate build-info.json" step generating JSON with:
  - `commitSha`: full commit SHA
  - `runId`: GitHub Actions run ID
  - `workflow`: workflow name
  - `timestamp`: ISO-8601 UTC timestamp
- Uploads to both `dev-shell/build-info.json` and `dev-shell/sha-<short>/build-info.json`

**Files**: .github/workflows/deploy-website.yml

### Task 2.3: ✅ Concurrency groups added

**Requirements**: SDP-A3  
**Changes**:

- Moved concurrency from workflow level to deploy-dev job specifically
- Concurrency block:
  ```yaml
  concurrency:
    group: deploy-website-dev
    cancel-in-progress: false
  ```
- Ensures dev shell deploys serialize instead of racing
- Keeps tag/prod groups separate (not affected by dev concurrency)

**Files**: .github/workflows/deploy-website.yml

### Task 2.4: Verification Plan

**Requirements**: SDP-A1, SDP-A2, SDP-A3

**Verification to be performed post-merge** (requires live GitHub Actions + Azure):

1. **SDP-A1 Scenario: Dev shell deploy publishes both root and SHA path**
   - Push commit modifying shell to main
   - After deploy completes, run:
     ```bash
     az storage blob list --account-name tssmfestorage --container-name dev-shell --prefix "" --auth-mode login
     ```
   - Verify: both root `index.html` and `sha-<short>/index.html` exist
   - Verify: SHA-path blob has `Cache-Control: public, max-age=31536000, immutable`

2. **SDP-A1 Scenario: Re-run does not modify SHA path**
   - Re-run the workflow from step 1
   - Verify: SHA-path blobs' ETags unchanged (conditional upload skipped)
   - Verify: root files refreshed

3. **SDP-A2 Scenario: Metadata file is served from dev shell root**
   - Fetch `https://tssmfestorage.blob.core.windows.net/dev-shell/build-info.json`
   - Verify: JSON contains `commitSha` (full), `runId`, `workflow`, `timestamp` (ISO-8601 UTC)
   - Verify: all four fields match the triggering workflow run

4. **SDP-A3 Scenario: Rapid successive shell merges queue instead of racing**
   - Push commit A modifying shell to main
   - Immediately push commit B modifying shell to main
   - Verify: second deploy job waits (visible in Actions UI as "queued")
   - After both complete, verify: `dev-shell/build-info.json` reports commit B's SHA

## Verification Commands

```bash
# Check blob paths exist
az storage blob list --account-name tssmfestorage --container-name dev-shell --auth-mode login --output table

# Fetch and inspect build-info.json
curl https://tssmfestorage.blob.core.windows.net/dev-shell/build-info.json | jq
curl https://tssmfestorage.blob.core.windows.net/dev-shell/sha-XXXXXXXX/build-info.json | jq

# Check blob properties (Cache-Control headers)
az storage blob show --account-name tssmfestorage --container-name dev-shell --name "sha-XXXXXXXX/index.html" --auth-mode login --query "properties.contentSettings.cacheControl"
```

## Requirements Coverage

| Requirement | Implemented | Evidence                                                              |
| ----------- | ----------- | --------------------------------------------------------------------- |
| SDP-A1      | ✅          | SHA-path upload step added with immutable cache headers               |
| SDP-A2      | ✅          | build-info.json generation and upload to both root and sha-<short>/   |
| SDP-A3      | ✅          | Concurrency group `deploy-website-dev` with cancel-in-progress: false |

## Files Modified

- `.github/workflows/deploy-website.yml` (extended with SHA paths, metadata, concurrency)
- `openspec/changes/dev-preview-deployments/tasks.md` (checkboxes updated)
