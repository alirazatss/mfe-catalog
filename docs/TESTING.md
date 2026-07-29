# Testing Guide

This document describes the comprehensive testing infrastructure for the MFE Runtime monorepo.

## Table of Contents

- [Test Layers](#test-layers)
- [Test Stack](#test-stack)
- [Coverage Thresholds](#coverage-thresholds)
- [Running Tests](#running-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Test Layers

### Unit Tests

**Scope:** Individual functions, modules, and components in isolation.

**Environment:** Node.js with happy-dom for DOM simulation

**Primary Command:** `pnpm test` or `pnpm test:coverage`

**File Location:** `packages/*/src/__tests__/*.test.ts` or `packages/*/src/**/*.test.ts`

**Tools:**

- Vitest (test runner)
- happy-dom (DOM simulation)
- @testing-library/react (component testing utilities)

**Coverage:** 210+ tests across all packages

**Example:**

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific package
cd packages/dynamic-loader && pnpm test

# Watch mode
pnpm test:watch
```

---

### Runtime Integration Tests

**Scope:** Cross-package interactions, HTTP requests, real Module Federation container loading.

**Environment:** Node.js with real HTTP servers (no browser)

**Primary Command:** `pnpm test:integration`

**File Location:** `tests/integration/**/*.test.ts`

**Tools:**

- Vitest (Node environment)
- Real HTTP servers via vp preview
- Orchestration via `scripts/test-integration.ts`

**Coverage:** 3 tests for manifest loading, lifecycle, chunk origin

**Ports:**

- Shell: 4173 (configurable via `INTEGRATION_SHELL_PORT`)
- MFE: 4174 (configurable via `INTEGRATION_MFE_PORT`)

**Features:**

- Pre-flight port checks
- Health check polling (30s timeout)
- Clean shutdown (SIGINT/SIGTERM)
- Diagnostics collection on failure

**Example:**

```bash
# Run integration tests
pnpm test:integration

# With custom ports
INTEGRATION_SHELL_PORT=5173 INTEGRATION_MFE_PORT=5174 pnpm test:integration
```

---

### End-to-End (E2E) Tests

**Scope:** Full user journeys in a real browser, including navigation, authentication, error scenarios, and cross-origin loading.

**Environment:** Chromium browser via Playwright

**Primary Command:** `pnpm test:e2e`

**File Location:** `tests/e2e/journeys/**/*.spec.ts`

**Tools:**

- Playwright (browser automation)
- Chromium (headless browser)
- Auth stub server (port 4275)

**Coverage:** 28 tests across 4 journey files

- `core.spec.ts` (5 tests): shell startup, MFE rendering, navigation, refresh
- `auth.spec.ts` (4 tests): authenticated/unauthenticated flows
- `remote-failures.spec.ts` (3 tests): 404 handling, error boundaries
- `cross-origin.spec.ts` (2 tests): cross-origin chunk loading

**Ports:**

- Shell: 4273 (configurable via `E2E_SHELL_PORT`)
- MFE: 4274 (configurable via `E2E_MFE_PORT`)
- Auth Stub: 4275 (configurable via `E2E_AUTH_PORT`)

**Features:**

- Two test projects: mocked-auth + auth-stub
- Cross-origin testing via host rules (shell.test, cdn.test)
- Console error auto-fail
- Screenshots/traces/videos on failure
- 7-day artifact retention

**Example:**

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run specific file
pnpm exec playwright test --config tests/e2e/playwright.config.ts core.spec.ts

# List all tests
pnpm exec playwright test --list --config tests/e2e/playwright.config.ts

# Install browsers (one-time)
pnpm exec playwright install chromium
```

---

### Component Tests

**Scope:** React components with user interactions (deferred - not yet implemented).

**Environment:** Vitest browser mode

**Primary Command:** `pnpm test:component` (not yet available)

**File Location:** `packages/*/src/**/*.component.test.tsx` (planned)

---

## Test Stack

| Tool                   | Version  | Purpose                                    |
| ---------------------- | -------- | ------------------------------------------ |
| Vitest                 | catalog: | Test runner for unit and integration tests |
| Playwright             | catalog: | Browser automation for E2E tests           |
| happy-dom              | catalog: | Lightweight DOM simulation for unit tests  |
| @testing-library/react | catalog: | React component testing utilities          |
| @vitest/coverage-v8    | catalog: | Code coverage via V8 provider              |
| @vitest/ui             | catalog: | Interactive UI for debugging tests         |
| tsx                    | catalog: | TypeScript execution for scripts           |

**Note:** All versions are managed via pnpm catalog. Run `pnpm ls <package>` to see installed versions.

---

## Coverage Thresholds

### Shared Packages

**Threshold:** 80% statements, 75% branches, 80% functions, 80% lines

**Applies to:**

- `packages/auth`
- `packages/auth-ui`
- `packages/dynamic-loader`
- `packages/events`
- `packages/monorepo-tools`
- `packages/remote-config`
- `packages/shell-runtime`
- `packages/utils`

### Shells and MFEs

**Threshold:** 70% statements, 65% branches, 70% functions, 70% lines

**Applies to:**

- `apps/shells/website`
- `apps/mfes/mfe-widget`

### Enforcement

Coverage thresholds are **enforced in CI**. Any package failing to meet its thresholds will cause the build to fail.

**Current Coverage:**

- `packages/dynamic-loader`: 78.37% statements (target: 80%)
- `packages/remote-config`: 100% (19 tests)
- `packages/auth-ui`: 80%+

**Commands:**

```bash
# Check coverage for all packages
pnpm test:coverage

# Check specific package
cd packages/dynamic-loader && pnpm test:coverage

# Merge coverage from integration tests
pnpm test:merge-coverage
```

---

## Running Tests

### Local Development

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run full CI suite locally
pnpm test:ci
# Equivalent to: vp check → test:coverage → build → test:integration → test:e2e

# Run everything (alias for test:ci)
pnpm ready
```

### Quality Gates

Three assertion scripts run in CI to enforce standards:

```bash
# Assert all packages have test scripts
pnpm exec tsx scripts/assert-package-test-scripts.ts

# Assert no arbitrary sleeps in tests (determinism)
pnpm exec tsx scripts/assert-no-arbitrary-sleeps.ts

# Assert no production code excluded from coverage
pnpm exec tsx scripts/assert-no-src-coverage-exclusions.ts
```

### Port Configuration

**Integration Tests:**

- `INTEGRATION_SHELL_PORT` (default: 4173)
- `INTEGRATION_MFE_PORT` (default: 4174)

**E2E Tests:**

- `E2E_SHELL_PORT` (default: 4273)
- `E2E_MFE_PORT` (default: 4274)
- `E2E_AUTH_PORT` (default: 4275)

**Pre-flight Checks:**

Both integration and E2E tests perform pre-flight port availability checks. If a port is in use, the test runner will exit with an actionable error message:

```
❌ Port 4173 is already in use.
   Action: Kill the process using port 4173 or configure a different port.
   Find process: lsof -ti:4173
   Kill process: kill $(lsof -ti:4173)
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

**Trigger:** Pull requests and pushes to `main`/`develop`

**Jobs:**

1. **install:** Install dependencies, cache pnpm store and node_modules
2. **lint:** Run linter (parallel with type-check and unit-tests)
3. **type-check:** Run TypeScript type checking
4. **unit-tests:** Run unit tests with coverage + quality gate assertions
5. **build:** Build all packages and cache artifacts
6. **integration-tests:** Run integration tests, upload diagnostics on failure
7. **e2e-tests:** Install Playwright browsers, run E2E tests, upload artifacts on failure
8. **gate:** CI gate that depends on all jobs (required for branch protection)

**Caching Strategy:**

- ✅ pnpm store (keyed by lockfile hash)
- ✅ node_modules (keyed by lockfile hash)
- ✅ Build artifacts (keyed by git SHA)
- ❌ Turbo outputs (never cached)
- ❌ Coverage reports (never cached)
- ❌ Test results (never cached)

**Artifacts:**

- Coverage reports (7 days)
- Integration test results (7 days, on failure)
- E2E test results (7 days, on failure)
- Playwright HTML report (7 days, always)

**Required Check for Branch Protection:**

Set the **gate** job as a required check in your repository settings to enforce that all tests must pass before merging.

---

## Troubleshooting

### Port Already in Use

**Problem:** Integration or E2E tests fail with "port already in use"

**Solution:**

```bash
# Find process using the port
lsof -ti:4173

# Kill the process
kill $(lsof -ti:4173)

# Or use custom ports
INTEGRATION_SHELL_PORT=5173 pnpm test:integration
```

### Coverage Below Threshold

**Problem:** `pnpm test:coverage` fails with coverage below threshold

**Solution:**

1. Check which package is failing: Look for the error message showing the package name
2. Review the coverage report: `open packages/<package>/coverage/index.html`
3. Add tests for uncovered code paths
4. See `packages/dynamic-loader/COVERAGE-AUDIT.md` for an example audit

### E2E Tests Failing

**Problem:** E2E tests fail in CI but pass locally

**Solution:**

1. Check uploaded artifacts in the GitHub Actions run
2. Review screenshots/traces/videos
3. Check Playwright report: Download and open `playwright-report/index.html`
4. Look for console errors in the captured logs
5. Run tests in headed mode locally: `pnpm exec playwright test --headed`

### Integration Tests Timeout

**Problem:** Integration tests timeout during health checks

**Solution:**

1. Verify build artifacts exist: `ls apps/shells/website/dist apps/mfes/mfe-widget/dist`
2. Run build: `pnpm build`
3. Check server logs in the orchestrator output
4. Increase timeout if necessary (edit `scripts/test-integration.ts`)

### Flaky Tests

**Problem:** Tests pass/fail intermittently

**Solution:**

1. Check for arbitrary sleeps: `pnpm exec tsx scripts/assert-no-arbitrary-sleeps.ts`
2. Use health check polling instead of fixed delays
3. Wait for network idle in E2E tests: `await page.waitForLoadState("networkidle")`
4. Avoid race conditions in async operations

---

## Best Practices

### Writing Unit Tests

✅ **DO:**

- Use descriptive test names
- Test one thing per test
- Use happy-dom for DOM operations
- Mock external dependencies
- Aim for 80%+ coverage

❌ **DON'T:**

- Use arbitrary sleeps (`setTimeout` without bound)
- Test implementation details
- Share state between tests
- Exclude production code from coverage

### Writing Integration Tests

✅ **DO:**

- Test real HTTP interactions
- Verify cross-package integration
- Use health check polling
- Collect diagnostics on failure

❌ **DON'T:**

- Mock Module Federation containers
- Use browser-specific APIs (use Node environment)
- Hard-code ports (use env vars)

### Writing E2E Tests

✅ **DO:**

- Test complete user journeys
- Wait for network idle
- Use Playwright fixtures
- Capture artifacts on failure
- Test error scenarios

❌ **DON'T:**

- Test internal implementation
- Use arbitrary waits
- Ignore console errors
- Skip cross-origin testing

---

## ADRs (Architectural Decision Records)

### ADR: Three-Layer Test Strategy

**Decision:** Implement unit, integration, and E2E test layers

**Rationale:**

- Unit tests: Fast feedback, high coverage, isolated
- Integration tests: Real HTTP, cross-package validation
- E2E tests: Complete user journeys, real browser

**Alternatives Considered:**

- Single-layer (E2E only): Too slow, hard to debug
- Two-layer (unit + E2E): Missing cross-package validation

### ADR: Port Isolation

**Decision:** Use different port ranges for integration (4173/4174) and E2E (4273/4274/4275)

**Rationale:**

- Prevents conflicts when running tests back-to-back
- Allows parallel execution in the future
- Clear separation of test environments

### ADR: No Turbo Output Caching in CI

**Decision:** Never cache Turbo outputs, coverage, or test results

**Rationale:**

- Tests must run fresh on every CI run
- Coverage must reflect current code
- Caching could hide regressions

### ADR: Console Errors Fail E2E Tests

**Decision:** Any `console.error` or uncaught exception fails the E2E test

**Rationale:**

- Enforces zero-error policy
- Catches issues early
- Prevents error suppression

---

## Contributing

When adding new tests:

1. **Choose the right layer:** Unit for isolated logic, integration for cross-package, E2E for user journeys
2. **Follow naming conventions:** `*.test.ts` for unit, `*.spec.ts` for E2E
3. **Update this guide:** Document new test categories or commands
4. **Maintain coverage:** Keep thresholds at or above current levels
5. **Run quality gates:** Ensure all assertion scripts pass

---

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Integration Tests README](../tests/integration/README.md)
- [E2E Tests README](../tests/e2e/README.md)
- [Coverage Audit Example](../packages/dynamic-loader/COVERAGE-AUDIT.md)
