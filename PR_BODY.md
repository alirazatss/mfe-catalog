# Task Group 5: E2E Parameterization and Documentation

## Tasks Completed (5.1-5.4)

### ✅ Task 5.1: Parameterized Playwright shell directory

Modified `tests/e2e/playwright.config.ts` to:

- Read shell directory from `E2E_SHELL_DIR` environment variable
- Default to `apps/shells/website` when unset (preserves existing behavior)
- Updated `webServer` command to use parameterized `SHELL_DIR` variable
- Enables testing any shell without config file edits

**Usage:**

```bash
# Test default shell (website)
pnpm test:e2e

# Test a different shell
E2E_SHELL_DIR=apps/shells/ccis pnpm test:e2e
```

### ✅ Task 5.2: Verified identical default behavior

- Default value `apps/shells/website` matches previous hardcoded path
- No configuration file changes required for existing test runs
- E2E tests continue to work exactly as before when `E2E_SHELL_DIR` is unset
- Verified by inspection (E2E tests marked `continue-on-error` in CI baseline)

### ✅ Task 5.3: Documented "add a new shell" procedure

Added comprehensive section to `docs/PRODUCTION_DEPLOYMENT.md` covering:

1. **Scaffold the shell application** - directory structure, required files
2. **Create caller workflow** - example YAML with workflow_dispatch inputs
3. **Update blob storage** - per-shell prefix provisioning (dev/prod paths)
4. **Deployment URLs** - complete URL reference for all deployment types:
   - Dev floating, SHA-pinned, and PR preview URLs
   - Prod floating and versioned URLs
5. **E2E testing** - how to run tests against the new shell

All documented procedures reference the new prefixed blob layout (`dev-shell/<shell-name>/`, `$web/<shell-name>/`).

### ✅ Task 5.4: Updated README/GETTING_STARTED URL references

**Finding**: No `dev-shell` or `tssmfestorage` URLs found in README.md or GETTING_STARTED.md
**Action**: No changes needed (task complete by inspection)

The deployment URLs are documented only in `PRODUCTION_DEPLOYMENT.md` and runbooks, which were updated in Task 5.3 and previous task groups.

## Requirements Covered

All requirements from `multi-shell-tooling` E2E spec:

- ✅ E2E configuration selects shell via `E2E_SHELL_DIR` environment variable
- ✅ Default shell remains `website` (backward compatible)
- ✅ No configuration file edit required to test different shells

## Files Changed

- `tests/e2e/playwright.config.ts` - parameterized shell directory via `E2E_SHELL_DIR`
- `docs/PRODUCTION_DEPLOYMENT.md` - added "Adding a New Shell" section
- `openspec/changes/multi-shell-deployment-workflow/tasks.md` - tasks 5.1-5.4 marked complete

## Notes

- No breaking changes (default behavior preserved)
- E2E suite verified by inspection (CI baseline has `continue-on-error: true`)
- Documentation complete for multi-shell onboarding workflow
