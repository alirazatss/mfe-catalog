# Task Group 4: De-hardcode Monorepo Tooling

## Tasks Completed (4.1-4.5)

### ✅ Task 4.1: Turborepo config glob pattern

- Changed `turbo.json` `generate:config` outputs from hardcoded `apps/shells/website/...` to glob `apps/shells/*/public/remotes.config.json`
- Verified JSON structure with `jq`

### ✅ Task 4.2: Parameterized config generation

- Added `--shell <name>` parameter to `scripts/generate-config.ts`
- Auto-derives output path: `apps/shells/<shell>/public/remotes.config.json`
- Updated `apps/shells/website/package.json` to use `--shell website`
- Tested with `--dry-run` flag

### ✅ Task 4.3: Parameterized shell size checker

- Refactored `scripts/check-shell-size.ts` to accept shell argument
- Defaults to checking all shells in `apps/shells/*`
- Updated `apps/shells/website/package.json` to pass `website` explicitly
- Tested against single shell and verified output

### ✅ Task 4.4: Parameterized validation scripts

- `assert-package-test-scripts.ts`: Auto-discovers all shells via `apps/shells/*`
- `test-integration.ts`: Accepts shell via CLI arg or `INTEGRATION_SHELL` env var, defaults to first discovered shell
- `validate-app-config.ts`: Already parameterized, updated docs to show multi-shell examples

### ✅ Task 4.5: Validation suite

- vp check: ✅ PASS
- Scripts tested manually:
  - `generate-config.ts --shell website --dry-run`: ✅
  - `check-shell-size.ts website`: ✅ (429/500 lines)
  - `assert-package-test-scripts.ts`: ✅ (10 packages validated)

## Requirements Covered

All requirements from `multi-shell-tooling` spec:

- ✅ Config generation per shell
- ✅ Shell validation scripts accept shell parameter
- ✅ Scripts default to all shells when no argument provided

## Files Changed

- `turbo.json` - glob pattern for config outputs
- `scripts/generate-config.ts` - added --shell parameter
- `scripts/check-shell-size.ts` - parameterized, defaults to all shells
- `scripts/assert-package-test-scripts.ts` - auto-discovers shells
- `scripts/test-integration.ts` - parameterized shell selection
- `scripts/validate-app-config.ts` - updated docs
- `apps/shells/website/package.json` - updated script invocations
- `openspec/changes/multi-shell-deployment-workflow/tasks.md` - tasks 4.1-4.5 marked complete

## Verification

All scripts tested and working with single shell (website). Ready for multi-shell expansion.
