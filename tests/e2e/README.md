# Browser E2E Tests

End-to-end tests using Playwright for comprehensive user journey validation.

## Overview

E2E tests exercise the **complete system** in a real browser:

- **Real browser rendering** (Chromium)
- **Real network requests** (shell + MFE)
- **Real Module Federation** (script loading, containers)
- **Real navigation** (routing, refresh, back/forward)
- **Cross-origin testing** (via host rules)

## Test Coverage

### Core Journeys (`core.spec.ts`)

- Shell startup and homepage rendering
- MFE widget rendering
- Direct navigation to nested routes
- Browser refresh on nested routes
- Cross-MFE navigation

### Authentication (`auth.spec.ts`)

- Authenticated user accessing protected routes
- Unauthenticated user blocked from protected routes
- Public routes accessible without auth
- Auth state persistence across navigation

### Remote Failures (`remote-failures.spec.ts`)

- Unmapped route (404 handling)
- Shell remains interactive when MFE fails
- Error boundary fallback UI

### Cross-Origin (`cross-origin.spec.ts`)

- MFE loading from different origin (cdn.test)
- Cross-origin chunk loading
- Host rules verification

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run specific test file
pnpm exec playwright test --config tests/e2e/playwright.config.ts core.spec.ts

# Run specific project
pnpm exec playwright test --config tests/e2e/playwright.config.ts --project chromium-mocked-auth

# List all tests
pnpm exec playwright test --list --config tests/e2e/playwright.config.ts
```

## Test Projects

### 1. `chromium-mocked-auth` (Default)

- Uses `window.__MFE_AUTH__` injected via `addInitScript`
- Fast, no external auth server required
- Suitable for most journeys

### 2. `chromium-auth-stub`

- Uses real auth stub HTTP server (port 4275)
- Tests token refresh, validation, auth unavailable
- Suitable for auth-specific edge cases

## Fixtures

### `authenticatedPage`

- Page with mocked auth state via `window.__MFE_AUTH__`
- User: `test@example.com`, roles: `["user"]`
- Token expires in 1 hour

### `unauthenticatedPage`

- Page without auth state
- Tests redirect/blocking behavior

### `consoleErrors`

- Auto-captures browser console errors
- **Test auto-fails if console.error detected**

## Configuration

**Playwright Config:** `tests/e2e/playwright.config.ts`

- **Shell Port:** 4273 (env: `E2E_SHELL_PORT`)
- **MFE Port:** 4274 (env: `E2E_MFE_PORT`)
- **Auth Stub Port:** 4275 (env: `E2E_AUTH_PORT`)
- **Host Rules:**
  - `shell.test` → `localhost:4273`
  - `cdn.test` → `localhost:4274`

## Artifacts on Failure

- **Screenshots:** `tests/e2e/test-results/`
- **Traces:** `tests/e2e/test-results/` (on retry)
- **Videos:** `tests/e2e/test-results/` (retained on failure)
- **HTML Report:** `tests/e2e/test-results/html/`

## Web Servers

Playwright automatically starts:

1. Shell preview server (port 4273)
2. MFE preview server (port 4274)
3. Auth stub server (port 4275)

Servers are **reused** in local dev (`reuseExistingServer: true`).

## Cross-Origin Testing

Host rules map hostnames to localhost ports:

```typescript
launchOptions: {
  args: [
    '--host-rules=MAP shell.test localhost:4273',
    '--host-rules=MAP cdn.test localhost:4274',
  ],
}
```

Tests can navigate to `http://shell.test:4273/widget` and verify MFE loads from `cdn.test`.

## Design Decisions

1. **Chromium only:** Cross-browser testing deferred to CI expansion
2. **Serial execution:** `fullyParallel: false` to avoid port conflicts
3. **Console errors fail tests:** Enforces zero-error policy
4. **Mocked auth default:** Faster than real auth server for most tests
5. **Screenshots on failure only:** Reduces artifact size
6. **Trace on first retry:** Debugging aid without overhead

## CI Integration

In CI:

- `fullyParallel: false` (single worker)
- `retries: 2`
- `reuseExistingServer: false`
- All artifacts uploaded on failure

## Local Development

```bash
# Install Playwright browsers (one-time)
pnpm exec playwright install chromium

# Run tests in headed mode
pnpm exec playwright test --config tests/e2e/playwright.config.ts --headed

# Debug specific test
pnpm exec playwright test --config tests/e2e/playwright.config.ts core.spec.ts --debug

# View trace
pnpm exec playwright show-trace tests/e2e/test-results/trace.zip
```

## Writing New Tests

1. **Import fixtures:**

   ```typescript
   import { test, expect } from "../fixtures/index.js";
   ```

2. **Use authenticated page:**

   ```typescript
   test("my test", async ({ authenticatedPage }) => {
     await authenticatedPage.goto("/widget");
     // ...
   });
   ```

3. **Console errors auto-fail:**
   - No need to manually check `consoleErrors`
   - Fixture automatically asserts zero errors after each test

4. **Wait for network idle:**
   ```typescript
   await page.waitForLoadState("networkidle");
   ```

## Requirements Covered

- **REQ-TI-E-1:** Chromium E2E tests ✅
- **REQ-TI-E-2:** Core user journeys ✅
- **REQ-TI-E-3:** Auth scenarios (mocked + stub) ✅
- **REQ-TI-E-4:** Remote failure handling ✅
- **REQ-TI-E-5:** Cross-origin testing ✅
- **REQ-TI-E-6:** Screenshots, traces, console capture ✅
