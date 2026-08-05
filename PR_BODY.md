# Task Group 1: Canonical MFE Dev Pipeline

## Implementation Summary

Implemented all tasks from task group 1 of the dev-preview-deployments change.

### Task 1.1: ✅ Prod tag flow already present

**Requirements**: MDP-M1  
**Evidence**: Verified deploy-mfes-turbo.yml already contains:

- Tag trigger (`mfe-*-v*`)
- `detect-tagged-mfe` job (extracts MFE name and version from tag)
- `validate-version` job (compares tag version with package.json)
- `deploy-prod` job (versioned upload to mfes-prod)
- Config-pin PR job (updates remotes.config.prod.json)

**Files**: .github/workflows/deploy-mfes-turbo.yml lines 11-14, 75-92, 95-126, 200-384

### Task 1.2: ✅ SHA-path uploads added

**Requirements**: MDP-A1, ABL-A1  
**Changes**:

- Added "Upload to SHA path (immutable)" step to deploy-dev job
- Uploads to `mfes-dev/<mfe>/sha-<short8>/` with `Cache-Control: public, max-age=31536000, immutable`
- Uses `--if-none-match "*"` for conditional upload (fail-if-exists semantics)
- Tolerates BlobAlreadyExists on workflow re-run (exit 0 if already exists)

**Files**: .github/workflows/deploy-mfes-turbo.yml lines 233-253

### Task 1.3: ✅ build-info.json generation added

**Requirements**: MDP-A2  
**Changes**:

- Added "Generate build-info.json" step generating JSON with:
  - `commitSha`: full commit SHA
  - `runId`: GitHub Actions run ID
  - `workflow`: workflow name
  - `timestamp`: ISO-8601 UTC timestamp
- Uploads to both `dev/build-info.json` and `sha-<short>/build-info.json`

**Files**: .github/workflows/deploy-mfes-turbo.yml lines 202-254

### Task 1.4: ✅ Concurrency groups added

**Requirements**: MDP-A3  
**Changes**:

- Added concurrency block to deploy-dev job:
  ```yaml
  concurrency:
    group: deploy-mfe-${{ matrix.mfe }}-dev
    cancel-in-progress: false
  ```
- Ensures deploys to the same MFE+dev target serialize instead of racing
- Different MFEs deploy in parallel (separate concurrency groups)

**Files**: .github/workflows/deploy-mfes-turbo.yml lines 138-140

### Task 1.5: ✅ Legacy workflow deleted

**Requirements**: MDP-M1  
**Changes**:

- Deleted `.github/workflows/deploy-mfes.yml`
- `deploy-mfes-turbo.yml` is now the single canonical MFE deploy workflow

**Files**: .github/workflows/deploy-mfes.yml (deleted)

### Task 1.6: Verification Plan

**Requirements**: MDP-M1, MDP-A1, MDP-A2, MDP-A3

**Verification to be performed post-merge** (requires live GitHub Actions + Azure):

1. **MDP-M1 Scenario: New MFE deploys without workflow changes**
   - Add a new MFE directory `apps/mfes/mfe-test/` with valid package.json
   - Push tag `mfe-test-v1.0.0`
   - Verify: workflow auto-extracts mfe-test and deploys to `mfes-prod/mfe-test/v1.0.0/`
   - No workflow file modifications required

2. **MDP-M1 Scenario: Exactly one workflow responds**
   - Modify `apps/mfes/mfe-widget/src/`
   - Push to main
   - Verify: exactly one workflow run starts
   - No `deploy-mfes.yml` exists in .github/workflows/

3. **MDP-A1 Scenario: Dev deploy publishes both pointer and SHA path**
   - Push commit modifying `mfe-widget` to main
   - After deploy completes, run:
     ```bash
     az storage blob list --account-name tssmfestorage --container-name mfes-dev --prefix "mfe-widget/dev/" --auth-mode login
     az storage blob list --account-name tssmfestorage --container-name mfes-dev --prefix "mfe-widget/sha-" --auth-mode login
     ```
   - Verify: both `dev/remoteEntry.js` and `sha-<short>/remoteEntry.js` exist
   - Verify: SHA-path blob has `Cache-Control: public, max-age=31536000, immutable`

4. **MDP-A1 Scenario: Re-run does not modify SHA path**
   - Re-run the workflow from step 3
   - Verify: SHA-path blobs' ETags unchanged (conditional upload skipped)
   - Verify: dev/ pointer refreshed

5. **MDP-A2 Scenario: Metadata file is served**
   - Fetch `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/dev/build-info.json`
   - Verify: JSON contains `commitSha` (full), `runId`, `workflow`, `timestamp` (ISO-8601 UTC)
   - Verify: all four fields match the triggering workflow run

6. **MDP-A2 Scenario: Metadata identifies SHA artifact**
   - Fetch `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/sha-<short>/build-info.json`
   - Verify: `commitSha` field's first 8 chars equal `<short>`

7. **MDP-A3 Scenario: Rapid merges queue instead of racing**
   - Push commit A modifying `mfe-widget` to main
   - Immediately push commit B modifying `mfe-widget` to main
   - Verify: second deploy job waits (visible in Actions UI as "queued")
   - After both complete, verify: `dev/build-info.json` reports commit B's SHA

8. **MDP-A3 Scenario: Different MFEs are not serialized**
   - Push commit changing `mfe-widget`
   - Push commit changing `mfe-landing-page`
   - Verify: both deploy jobs run in parallel (neither waits on the other)

## Verification Commands

```bash
# Check blob paths exist
az storage blob list --account-name tssmfestorage --container-name mfes-dev --prefix "mfe-widget/" --auth-mode login --output table

# Fetch and inspect build-info.json
curl https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/dev/build-info.json | jq
curl https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/sha-XXXXXXXX/build-info.json | jq

# Check blob properties (Cache-Control headers)
az storage blob show --account-name tssmfestorage --container-name mfes-dev --name "mfe-widget/sha-XXXXXXXX/remoteEntry.js" --auth-mode login --query "properties.contentSettings.cacheControl"
```

## Requirements Coverage

| Requirement | Implemented | Evidence                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------------ |
| MDP-M1      | ✅          | deploy-mfes-turbo.yml has complete tag flow; deploy-mfes.yml deleted           |
| MDP-A1      | ✅          | SHA-path upload step added with immutable cache headers                        |
| MDP-A2      | ✅          | build-info.json generation and upload to both dev/ and sha-<short>/            |
| MDP-A3      | ✅          | Concurrency group `deploy-mfe-<matrix.mfe>-dev` with cancel-in-progress: false |

## Files Modified

- `.github/workflows/deploy-mfes-turbo.yml` (extended with SHA paths, metadata, concurrency)
- `.github/workflows/deploy-mfes.yml` (deleted)
- `openspec/changes/dev-preview-deployments/tasks.md` (checkboxes updated)
