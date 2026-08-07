# Task Group 3: Multi-shell preview and cleanup workflows

## Tasks Completed (3.1-3.4)

### ✅ Task 3.1: Extended change detection to detect affected shells

Modified `deploy-previews.yml` detection job to:

- Detect changed shells across `apps/shells/*` using Turborepo filter
- Output both `changed_shells` array and `shell_matrix` for matrix jobs
- Renamed job to "Detect Changed MFEs and Shells" for clarity

### ✅ Task 3.2: Parameterized preview-shell job by shell

Converted preview shell deployment from single job to matrix job:

- Matrix iterates over detected shells from `shell_matrix`
- Each shell builds independently: `pnpm --filter "${{ matrix.shell }}..." build`
- Uploads to per-shell prefix: `dev-shell/<shell-name>/pr-<n>/`
- Skips shells not affected by the PR (matrix is empty if no shell changes)
- Updated config generation to use `SHELL_NAME` env var

### ✅ Task 3.3: Updated sticky comment to list all deployed preview shells

Modified `comment-preview-urls` job to:

- Parse `changed_shells` array from detection output
- Generate preview URLs for every deployed shell with its shell prefix
- Format: `https://tssmfestorage.blob.core.windows.net/dev-shell/<shell>/pr-<n>/index.html`
- Shows shell count and lists each shell with its URL and build-info link
- Falls back gracefully when no shells changed

### ✅ Task 3.4: Updated cleanup to delete per-shell prefixed previews

Modified `cleanup-previews.yml` to:

- Discover all shell directories in `dev-shell/` container dynamically
- For each shell, delete blobs under `<shell>/pr-<n>/` prefix
- Tolerates shells with no preview (no error if prefix doesn't exist)
- Reports total deleted blobs across all shells
- Maintains same cleanup guarantees (only this PR's blobs, not other PRs or floating paths)

### 🔄 Task 3.5: Manual verification pending

Verification requires creating a test PR to confirm:

- Preview lands under correct shell prefix
- Comment URLs resolve correctly
- Closing PR deletes only that PR's prefixed blobs

## Breaking Changes

**Preview shell URLs now include shell name prefix:**

| Environment     | Old URL                            | New URL                                       |
| --------------- | ---------------------------------- | --------------------------------------------- |
| PR preview      | `/dev-shell/pr-42/index.html`      | `/dev-shell/website/pr-42/index.html`         |
| build-info.json | `/dev-shell/pr-42/build-info.json` | `/dev-shell/website/pr-42/build-info.json`    |
| Cleanup path    | `pr-42/` in dev-shell              | `website/pr-42/`, `ccis/pr-42/` (every shell) |

## Requirements Covered

All modified requirements from `pr-preview-deployments` spec:

- ✅ Detect affected shells across `apps/shells/*`
- ✅ Deploy each affected shell to `dev-shell/<shell-name>/pr-<n>/`
- ✅ Skip unaffected shells (matrix empty when no shell changes)
- ✅ Sticky comment lists every deployed shell with shell prefix in URL
- ✅ Cleanup deletes all shells' PR blobs (tolerates missing previews)

## Files Changed

- `.github/workflows/deploy-previews.yml` - shell matrix, per-shell build/upload, multi-shell comment
- `.github/workflows/cleanup-previews.yml` - per-shell cleanup loop
- `openspec/changes/multi-shell-deployment-workflow/tasks.md` - tasks 3.1-3.4 marked complete

## Notes

- Task 3.5 (verification) deferred to manual testing with a real test PR
- No changes to `scripts/azure/generate-preview-config.ts` needed (already parameterized by shell via SHELL_NAME env var in workflow)
- Cleanup discovers shells dynamically (future-proof for new shells)
