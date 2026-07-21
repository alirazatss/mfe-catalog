# Tasks: E2E Smoke Test

## Overview

Create Playwright E2E smoke test covering login → widget load → authenticated API call → logout journey. Mock backend with MSW.

---

## 1. Set Up Playwright and MSW

**Owner Skill**: `tester`  
**REQ**: e2e-smoke-test, mock-backend-auth (setup requirements)  
**Effort**: 1-2 hours  
**Dependencies**: None

### 1.1 Verify Playwright installed

- [ ] Check `package.json` for `@playwright/test` in devDependencies
- [ ] If missing, run: `pnpm add -D @playwright/test`
- [ ] Run: `pnpm exec playwright install` to download browsers

### 1.2 Install MSW (Mock Service Worker)

- [ ] Add MSW: `pnpm add -D msw`
- [ ] Create `tests/e2e/mocks/handlers.ts`
- [ ] Create `tests/e2e/mocks/server.ts`

### 1.3 Create Playwright config

- [ ] Create `playwright.config.ts` at root
- [ ] Configure:
  - `testDir: 'tests/e2e'`
  - `baseURL: 'http://localhost:5173'`
  - `webServer: { command: 'pnpm dev', url: 'http://localhost:5173' }`
  - Screenshots/videos on failure
  - Timeout: 30s

### 1.4 Create test directory structure

- [ ] Create `tests/e2e/` directory
- [ ] Create `tests/e2e/mocks/` for mock handlers
- [ ] Create `tests/e2e/fixtures/` for test data
- [ ] Create `tests/e2e/smoke.spec.ts` for test

---

## 2. Implement Mock Backend Endpoints

**Owner Skill**: `frontend-developer`  
**REQ**: mock-backend-auth (all requirements)  
**Effort**: 1-2 hours  
**Dependencies**: Section 1

### 2.1 Define mock auth endpoints

- [ ] Create `tests/e2e/mocks/handlers.ts`
- [ ] Implement handler: `POST /api/auth/login`
  - Accept `{ email, password }`
  - Return `{ accessToken: <jwt>, user: { email, id }, expiresIn: 900 }`
  - Include `Set-Cookie` header with HttpOnly refresh token
- [ ] Implement handler: `POST /api/auth/refresh`
  - Accept HttpOnly cookie
  - Return `{ accessToken: <new-jwt>, expiresIn: 900 }`
- [ ] Implement handler: `POST /api/auth/logout`
  - Return 204 No Content

### 2.2 Create protected API endpoint handler

- [ ] Implement handler: `GET /api/widgets`
  - Check `Authorization: Bearer <token>` header
  - If missing/invalid, return 401
  - If valid, return 200 with `{ widgets: [] }` (empty array OK for MVP)

### 2.3 Implement MSW server setup

- [ ] Create `tests/e2e/mocks/server.ts`
- [ ] Export MSW server configured with handlers
- [ ] Server starts before E2E test, stops after

### 2.4 Create JWT token generator for tests

- [ ] Create `tests/e2e/fixtures/jwt.ts`
- [ ] Export `generateTestJWT(payload)` function
- [ ] Token includes: `{ sub: '1', email: 'test@example.com', iat, exp (30min future) }`
- [ ] Token is valid for test duration

### 2.5 Create test data constants

- [ ] Create `tests/e2e/fixtures/config.ts`
- [ ] Export constants:
  - `TEST_EMAIL = 'test@example.com'`
  - `TEST_PASSWORD = 'password123'`
  - `TEST_USER = { id: '1', email: TEST_EMAIL, name: 'Test User' }`

---

## 3. Implement MVP Smoke Test

**Owner Skill**: `tester`  
**REQ**: e2e-smoke-test (all scenario requirements)  
**Effort**: 2-3 hours  
**Dependencies**: Section 2

### 3.1 Create smoke test file

- [ ] Create `tests/e2e/smoke.spec.ts`
- [ ] Import Playwright test utilities
- [ ] Import MSW server and handlers
- [ ] Set up beforeEach to start MSW server, afterEach to stop

### 3.2 Test scenario 1: Unauthenticated redirect

- [ ] Test: `should redirect unauthenticated user to /login`
- [ ] Action: `await page.goto('/')`
- [ ] Assertion: `page.url().includes('/login')`

### 3.3 Test scenario 2: Login form and submission

- [ ] Test: `should login with email/password`
- [ ] Action: Fill email input with TEST_EMAIL
- [ ] Action: Fill password input with TEST_PASSWORD
- [ ] Action: Click submit button
- [ ] Wait for: Network idle or navigation complete
- [ ] Assertion: URL no longer contains `/login`

### 3.4 Test scenario 3: Auth bridge populated after login

- [ ] Test: `should populate window.__MFE_AUTH__ after login`
- [ ] Script: `const auth = await page.evaluate(() => window.__MFE_AUTH__)`
- [ ] Assertion: `auth.isAuthenticated === true`
- [ ] Assertion: `auth.getAccessToken() !== null`

### 3.5 Test scenario 4: MFE widget loads

- [ ] Test: `should load mfe-widget after login`
- [ ] Wait for: `page.locator('[id="main-slot"]')` to be visible
- [ ] Assertion: MFE content visible in main-slot
- [ ] Alternative: Check for MFE-specific element (e.g., "Widget" text or button)

### 3.6 Test scenario 5: Authenticated API call

- [ ] Test: `should make authenticated API call from MFE`
- [ ] Setup: Intercept network requests with `page.on('request')`
- [ ] Action: Trigger action in MFE that calls `GET /api/widgets`
- [ ] Assertion: Request includes `Authorization: Bearer <token>` header
- [ ] Assertion: Response status 200

### 3.7 Test scenario 6: Logout

- [ ] Test: `should logout when logout button clicked`
- [ ] Action: Find logout button (likely in header MFE or shell UI)
- [ ] Action: Click logout button
- [ ] Wait for: Navigation or state change
- [ ] Assertion: POST `/api/auth/logout` was called

### 3.8 Test scenario 7: After logout redirect to login

- [ ] Test: `should redirect to login after logout`
- [ ] Assertion: `page.url().includes('/login')`
- [ ] Assertion: `auth.isAuthenticated === false`

### 3.9 Test scenario 8: Token cleared after logout

- [ ] Test: `should clear token from window.__MFE_AUTH__`
- [ ] Script: `const auth = await page.evaluate(() => window.__MFE_AUTH__)`
- [ ] Assertion: `auth.getAccessToken() === null`
- [ ] Assertion: `auth.isAuthenticated === false`

---

## 4. Add Test Fixtures and Helpers

**Owner Skill**: `tester`  
**REQ**: e2e-smoke-test (test support requirements)  
**Effort**: 1 hour  
**Dependencies**: Section 3

### 4.1 Create Playwright fixture for auth

- [ ] Create `tests/e2e/fixtures/auth-fixture.ts`
- [ ] Export `loginFixture()` helper that:
  - Fills login form with TEST_EMAIL / TEST_PASSWORD
  - Clicks submit
  - Waits for auth bridge to populate
  - Returns page context

### 4.2 Create helper for waiting for MFE

- [ ] Export `waitForMFEWidget(page)` helper
- [ ] Waits for main-slot to have content
- [ ] Timeout: 10s

### 4.3 Create helper for API call verification

- [ ] Export `verifyBearerToken(page)` helper
- [ ] Intercepts network requests
- [ ] Asserts Authorization header present
- [ ] Extracts and validates JWT

---

## 5. Run and Validate Test

**Owner Skill**: `tester`  
**REQ**: e2e-smoke-test (all requirements)  
**Effort**: 30 minutes  
**Dependencies**: Section 4

### 5.1 Run test locally

- [ ] Ensure dev servers NOT running: `pnpm dev` will be started by Playwright
- [ ] Run: `pnpm exec playwright test tests/e2e/smoke.spec.ts`
- [ ] Test should pass
- [ ] Output shows all 8 scenarios passing

### 5.2 Run test multiple times

- [ ] Run test 3x to confirm consistency
- [ ] All 3 runs should pass
- [ ] No flakiness detected

### 5.3 Verify failure mode

- [ ] Manually break one assertion (e.g., change expected URL)
- [ ] Run test
- [ ] Verify test fails with clear error message
- [ ] Fix assertion and re-run
- [ ] Test passes again

### 5.4 Check screenshots/videos on failure

- [ ] Intentionally break test
- [ ] Run test
- [ ] Verify screenshot captured in `test-results/`
- [ ] Video captured showing failure moment

### 5.5 Verify dev server startup

- [ ] Kill any running dev servers
- [ ] Run test
- [ ] Verify Playwright starts dev server automatically
- [ ] Verify dev server connects to shell at http://localhost:5173

---

## 6. Integrate into CI/CD (Future)

**Owner Skill**: `team-lead`  
**REQ**: Future (not MVP; defer to post-MVP task)  
**Effort**: 1-2 hours (deferred)  
**Dependencies**: Section 5 complete

### 6.1 Create CI workflow (deferred)

- [ ] (Post-MVP) Add GitHub Actions job to run E2E test
- [ ] (Post-MVP) Job should run on every PR
- [ ] (Post-MVP) Job should block merge if test fails

### 6.2 Documentation (deferred)

- [ ] (Post-MVP) Add to CONTRIBUTING.md: how to run E2E test locally
- [ ] (Post-MVP) Add troubleshooting guide for common E2E failures

---

## 7. Documentation

**Owner Skill**: `team-lead`  
**REQ**: e2e-smoke-test (documentation requirement)  
**Effort**: 30 minutes  
**Dependencies**: Section 5 complete

### 7.1 Create E2E testing guide

- [ ] Create `docs/E2E_TESTING.md`
- [ ] Document: "How to run the MVP smoke test locally"
- [ ] Command: `pnpm exec playwright test tests/e2e/smoke.spec.ts`
- [ ] Expected output: All 8 scenarios passing

### 7.2 Document mock backend

- [ ] Explain: MSW intercepts network requests
- [ ] List endpoints available: /api/auth/login, /api/auth/logout, /api/widgets
- [ ] Note: Handlers in `tests/e2e/mocks/handlers.ts`

### 7.3 Document test structure

- [ ] Explain 8 scenarios and what each validates
- [ ] Link to spec file for full details

---

## Acceptance Criteria

- [x] Playwright installed and configured
- [x] MSW mock backend implemented
- [x] MVP smoke test covers: login → widget → API call → logout
- [x] Test passes consistently (3x run = 3x pass)
- [x] Test provides clear pass/fail verdict
- [x] Documentation guides developers to run test locally
- [x] Success = MVP user journey validated end-to-end
