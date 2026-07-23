# E2E Smoke Test - Design

## Design Summary

Create one Playwright E2E test that validates the complete MVP user journey: unauthenticated → login → shell loads mfe-widget → MFE makes authenticated API call → logout → redirect to login. Backend endpoints mocked with MSW (Mock Service Worker) to enable fast, reliable testing.

## Architecture

### E2E Test File Structure

**Location**: `tests/e2e/mvp-smoke.spec.ts` (or `apps/shells/website/tests/e2e/...`)

**Framework**: Playwright (installed in MVP environment)

**Test structure**:

```typescript
test("MVP user journey", async ({ page }) => {
  // 1. Navigate to unauthenticated shell
  // 2. Verify redirect to /login
  // 3. Fill login form and submit
  // 4. Verify login successful (token in memory, cookie set)
  // 5. Verify shell bootstraps and loads mfe-widget
  // 6. Verify MFE renders in main-slot
  // 7. Trigger MFE to make authenticated API call (e.g., GET /api/widgets)
  // 8. Verify Bearer token in request
  // 9. Verify response received
  // 10. Click logout button
  // 11. Verify redirect to /login
  // 12. Verify token cleared
});
```

### Mock Backend

**Tool**: MSW (Mock Service Worker)

**Why MSW**:

- Intercepts fetch/XMLHttpRequest at network level
- Works seamlessly with browser (Playwright)
- No port conflicts with dev servers
- Zero modification to app code

**Endpoints**:

- `POST /api/auth/login` → return JWT + set cookie
- `POST /api/auth/refresh` → return new JWT
- `POST /api/auth/logout` → return 204
- `GET /api/widgets` → require Bearer token, return sample data

**Setup**: MSW starts before test, handlers defined, mock server active during test.

### Playwright Configuration

**Location**: Create `playwright.config.ts` at root (or extend existing)

**Config**:

```typescript
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    // Dev server started before test
    command: "pnpm dev",
    url: "http://localhost:5173",
    reuseExistingServer: false,
  },
});
```

### Test Data and Fixtures

**Fixtures**:

- Mock user: `{ email: 'test@example.com', name: 'Test User' }`
- Mock token: Valid JWT with exp far in future
- Mock refresh token: Stored in HttpOnly cookie

**Constants**: Centralize test values (email, password, URLs) in `tests/e2e/fixtures/config.ts`

## Test Assertions

1. **Unauthenticated access**: Navigation to `/` redirects to `/login`
2. **Login successful**: POST to `/api/auth/login` succeeds, token stored, cookie set
3. **Shell bootstrap**: manifest fetched, auth bridge initialized
4. **MFE loading**: mfe-widget remote entry fetched, component renders in main-slot
5. **Auth context available**: `window.__MFE_AUTH__` populated in browser
6. **Authenticated API call**: MFE makes GET `/api/widgets` with Bearer token
7. **Response received**: API returns 200 with sample data
8. **Logout successful**: POST `/api/auth/logout` clears token and cookie
9. **Redirect after logout**: Shell navigates to `/login`

## Trade-offs

| Option                             | Pros                               | Cons                          | Choice                     |
| ---------------------------------- | ---------------------------------- | ----------------------------- | -------------------------- |
| Playwright vs Cypress vs Puppeteer | Modern, fast, multi-browser        | Steeper learning curve        | Playwright                 |
| MSW vs real backend                | Fast, no network, fully controlled | Diverges from production auth | MSW for MVP                |
| One test vs multiple               | Simple, fast                       | Less granular failures        | One smoke test for MVP     |
| Run on every commit vs nightly     | Fast feedback                      | May be slow                   | On commit (should be <30s) |

## Backward Compatibility

Test-only change. No production code modified.

## Risk Mitigation

- **Risk**: Test flaky due to timing issues
- **Mitigation**: Use Playwright wait utilities (waitForNavigation, waitForSelector) instead of hardcoded delays

- **Risk**: MSW intercepts real requests accidentally
- **Mitigation**: MSW handlers scoped to test only, not used in production

- **Risk**: Dev server not running when test starts
- **Mitigation**: Playwright webServer config handles startup automatically

## Success Metrics

- Test passes consistently (runs 5x with same result)
- Test runtime <30s
- Test provides clear pass/fail verdict (journey successful or not)
- Test can be added to CI/CD pipeline
