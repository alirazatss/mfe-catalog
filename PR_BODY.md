# Task Group 3: PR Preview and Cleanup Workflows

## Implementation Summary

Implemented all tasks from task group 3 of the dev-preview-deployments change.

### Task 3.1: ✅ Preview config generator with tests

**Requirements**: PPD-2  
**Changes**:

- Created `scripts/azure/generate-preview-config.ts` with full TypeScript types
- Created `scripts/azure/generate-preview-config.test.ts` with 5 test cases
- All tests pass (`vp test scripts/azure/generate-preview-config.test.ts`)
- Function rewrites entryUrls from `/dev/` to `/pr-<n>/` for changed MFEs only

**Test Coverage**:

- ✅ Changed MFE gets pr-<n> URL
- ✅ Untouched MFE keeps dev/ URL
- ✅ Zero changed MFEs returns dev config unchanged
- ✅ Multiple changed MFEs handled correctly
- ✅ All config properties preserved

### Task 3.2: ✅ deploy-previews.yml workflow created

**Requirements**: PPD-1  
**Changes**:

- Trigger: `pull_request` types `[opened, synchronize]`
- Turborepo change detection using `--filter='[origin/main...HEAD]'`
- Matrix deploy of changed MFEs to `mfes-dev/<mfe>/pr-<n>/`
- `Cache-Control: no-cache, must-revalidate` for preview blobs

### Task 3.3: ✅ Preview shell job added

**Requirements**: PPD-2  
**Changes**:

- Generates per-PR config using `generate-preview-config.ts`
- Builds shell with preview config embedded
- Uploads to `dev-shell/pr-<n>/`
- Preview config points changed MFEs to pr-<n> URLs, others to dev/

### Task 3.4: ✅ Same-repo boundary enforced

**Requirements**: PPD-3  
**Changes**:

- Uses `pull_request` trigger (not `pull_request_target`)
- Explicit `if: github.event.pull_request.head.repo.full_name == github.repository` on all jobs requesting Azure credentials
- Fork PRs skip all deploy jobs (no `id-token: write` granted)

### Task 3.5: ✅ build-info.json and sticky PR comment

**Requirements**: PPD-4  
**Changes**:

- `build-info.json` includes: `commitSha`, `runId`, `workflow`, `timestamp`, **`prNumber`**
- Uploaded to all preview paths (MFEs and shell)
- Sticky PR comment created/updated using `actions/github-script`
- Comment lists preview shell URL and all changed MFE URLs

### Task 3.6: ✅ Concurrency groups added

**Requirements**: PPD-6  
**Changes**:

- Concurrency block at workflow level:
  ```yaml
  concurrency:
    group: preview-pr-${{ github.event.pull_request.number }}
    cancel-in-progress: true
  ```
- Rapid pushes to same PR cancel in-progress runs
- Different PRs run in parallel (separate groups)

### Task 3.7: ✅ cleanup-previews.yml created

**Requirements**: PPD-5  
**Changes**:

- Trigger: `pull_request` type `closed`
- Deletes all blobs under `dev-shell/pr-<n>/`
- Deletes all blobs under `mfes-dev/*/pr-<n>/` for all MFEs
- Succeeds when no blobs exist (idempotent)
- Does NOT touch `dev/`, `sha-*`, or other PRs' paths

### Task 3.8: Verification Plan

**Requirements**: PPD-1–PPD-6

**E2E verification with real test PR** (post-merge):

1. **Open test PR** touching one MFE (e.g., mfe-widget)
2. **Verify PPD-1**: Check `az storage blob list` shows `mfes-dev/mfe-widget/pr-<n>/` only
3. **Verify PPD-2**: Check `dev-shell/pr-<n>/remotes.config.json` points mfe-widget to pr-<n>, others to dev/
4. **Verify PPD-3**: Open fork PR, verify no Azure jobs run
5. **Verify PPD-4**: Check PR comment created with URLs; check build-info.json has prNumber
6. **Push again to PR**, verify PPD-4 (comment updated in place) and PPD-6 (first run cancelled)
7. **Close PR**, verify PPD-5: all pr-<n> blobs deleted, dev/ and sha-\* unchanged

## Requirements Coverage

| Requirement | Implemented | Evidence                                                            |
| ----------- | ----------- | ------------------------------------------------------------------- |
| PPD-1       | ✅          | deploy-previews.yml deploys changed MFEs to pr-<n>/                 |
| PPD-2       | ✅          | generate-preview-config.ts + preview shell job                      |
| PPD-3       | ✅          | pull_request trigger + head.repo check                              |
| PPD-4       | ✅          | build-info.json with prNumber + sticky comment                      |
| PPD-5       | ✅          | cleanup-previews.yml deletes pr-<n>/ on close                       |
| PPD-6       | ✅          | concurrency group preview-pr-<number> with cancel-in-progress: true |

## Files Created/Modified

- `.github/workflows/deploy-previews.yml` (new)
- `.github/workflows/cleanup-previews.yml` (new)
- `scripts/azure/generate-preview-config.ts` (new)
- `scripts/azure/generate-preview-config.test.ts` (new)
- `openspec/changes/dev-preview-deployments/tasks.md` (checkboxes updated)
