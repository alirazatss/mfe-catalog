## Why

The test suite currently has 59 failing tests due to two blocking issues: (1) DOM test environment not configured in vitest for component tests, and (2) test mocks still using obsolete `window.__AUTH__` instead of the current `window.__MFE_AUTH__` bridge contract. These failures must be resolved before MVP release to ensure test coverage is meaningful and CI/CD can validate the shell and MFE auth integration.

## What Changes

- Update all vitest.config.ts files to configure `happy-dom` or `jsdom` environment for DOM-dependent tests
- Replace all `window.__AUTH__` mock references with current `window.__MFE_AUTH__` contract in test fixtures
- Update test utilities to set up the MFEAuthBridge correctly in test setup
- Fix test helpers to emit correct event types from `@mfe-runtine/events` (e.g., `mfe:auth:login` not `auth:login`)
- Add DOM environment setup to `apps/shells/website/` and `apps/mfes/mfe-widget/` vitest configs
- Update shell test setup to mock `DynamicLoader` correctly (load, unload, update, getSlotOccupant methods)

## Capabilities

### New Capabilities

- `test-environment-setup`: Configure DOM test environments across all packages and apps
- `auth-bridge-mocking`: Test utilities for mocking `window.__MFE_AUTH__` bridge contract

### Modified Capabilities

- `testing-infrastructure` (existing): Update fixture utilities to use current `window.__MFE_AUTH__` contract

## Impact

- **Affected code**: 59 failing tests across packages/ and apps/
- **Affected files**: All vitest.config.ts files, test fixtures, mock factories
- **Dependencies**: Requires happy-dom (already in devDependencies)
- **Breaking**: None (test-only changes)
- **Target pass rate**: 140 passing → 199 passing (59 fixed failures)

---

## Acceptance Criteria

- [ ] All 59 failing tests pass
- [ ] Total test count: ≥199 passing
- [ ] No `window.__AUTH__` references remain in test files
- [ ] All DOM-dependent tests have environment configured
- [ ] Shell auth bridge mocking works with correct `window.__MFE_AUTH__` shape
- [ ] `vp run test:run` completes with 0 failures
