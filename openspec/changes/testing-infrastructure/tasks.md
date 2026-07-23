# Tasks: Testing Infrastructure

## 1. Setup Testing Dependencies

- [ ] 1.1 Add vitest to root package.json devDependencies
- [ ] 1.2 Add @testing-library/react to root package.json devDependencies
- [ ] 1.3 Add @testing-library/user-event to root package.json devDependencies
- [ ] 1.4 Add @vitest/ui to root package.json devDependencies
- [ ] 1.5 Add happy-dom to root package.json devDependencies
- [ ] 1.6 Run `pnpm install` to install dependencies

**Depends on**: None  
**Owner**: Frontend developer  
**Estimate**: 30 minutes

---

## 2. Configure Packages Testing (packages/auth)

- [ ] 2.1 Create `packages/auth/vitest.config.ts`
- [ ] 2.2 Configure Node environment (no DOM needed)
- [ ] 2.3 Set coverage thresholds (80/75/80/80)
- [ ] 2.4 Add test scripts to `packages/auth/package.json`
- [ ] 2.5 Create `packages/auth/src/test/utils.ts` for test helpers

**Depends on**: Section 1  
**Owner**: Frontend developer  
**Estimate**: 1 hour

---

## 3. Write Unit Tests for packages/auth

- [ ] 3.1 Create `TokenManager.test.ts`
- [ ] 3.2 Test: setAccessToken stores token correctly
- [ ] 3.3 Test: getAccessToken retrieves token
- [ ] 3.4 Test: isAuthenticated returns correct boolean
- [ ] 3.5 Test: clear removes token and cancels timer
- [ ] 3.6 Test: scheduleRefresh calculates 80% lifetime
- [ ] 3.7 Test: decodeJWT extracts payload correctly
- [ ] 3.8 Test: decodeJWT throws on invalid JWT
- [ ] 3.9 Test: refreshToken deduplication (multiple simultaneous calls)
- [ ] 3.10 Run tests and verify coverage >80%

**Depends on**: Section 2  
**Owner**: Frontend developer  
**Estimate**: 3-4 hours

---

## 4. Configure Packages Testing (packages/events)

- [ ] 4.1 Create `packages/events/vitest.config.ts`
- [ ] 4.2 Configure Node environment
- [ ] 4.3 Set coverage thresholds (80/75/80/80)
- [ ] 4.4 Add test scripts to `packages/events/package.json`
- [ ] 4.5 Create `packages/events/src/test/utils.ts`

**Depends on**: Section 1  
**Owner**: Frontend developer  
**Estimate**: 1 hour

---

## 5. Write Unit Tests for packages/events

- [ ] 5.1 Create `EventBus.test.ts`
- [ ] 5.2 Test: emit and listen to event
- [ ] 5.3 Test: once listener fires only once
- [ ] 5.4 Test: cleanup function removes listener
- [ ] 5.5 Test: multiple listeners for same event
- [ ] 5.6 Test: singleton pattern (same instance)
- [ ] 5.7 Create `helpers.test.ts`
- [ ] 5.8 Test: emitMFEEvent dispatches correct event
- [ ] 5.9 Test: onMFEEvent registers listener and returns cleanup
- [ ] 5.10 Run tests and verify coverage >80%

**Depends on**: Section 4  
**Owner**: Frontend developer  
**Estimate**: 2-3 hours

---

## 6. Configure Shell Testing (apps/shells/website)

- [ ] 6.1 Create `apps/shells/website/vitest.config.ts`
- [ ] 6.2 Configure happy-dom environment
- [ ] 6.3 Add @vitejs/plugin-react to config
- [ ] 6.4 Configure path aliases to match tsconfig
- [ ] 6.5 Set coverage thresholds (70/65/70/70)
- [ ] 6.6 Add test scripts to `apps/shells/website/package.json`
- [ ] 6.7 Create `apps/shells/website/src/test/` directory
- [ ] 6.8 Create `apps/shells/website/src/test/setup.ts`
- [ ] 6.9 Create `apps/shells/website/src/test/utils.tsx` (renderWithAuth, renderWithRouter)
- [ ] 6.10 Create `apps/shells/website/src/test/mocks.ts` (mockUser, mockApiResponse)

**Depends on**: Section 1  
**Owner**: Frontend developer  
**Estimate**: 2 hours

---

## 7. Write Unit Tests for Shell Components

- [ ] 7.1 Create `ProtectedRoute.test.tsx`
- [ ] 7.2 Test: redirects to login when not authenticated
- [ ] 7.3 Test: renders children when authenticated
- [ ] 7.4 Test: shows loading state while checking auth
- [ ] 7.5 Test: preserves return URL in location state
- [ ] 7.6 Create `NavigationEventListener.test.tsx`
- [ ] 7.7 Test: listens for mfe:navigate events
- [ ] 7.8 Test: validates path before navigating
- [ ] 7.9 Test: blocks external URLs
- [ ] 7.10 Create `Layout.test.tsx`
- [ ] 7.11 Test: displays logout button when authenticated
- [ ] 7.12 Test: displays login link when not authenticated
- [ ] 7.13 Test: shows user name when authenticated

**Depends on**: Section 6  
**Owner**: Frontend developer  
**Estimate**: 3-4 hours

---

## 8. Write Integration Tests for Shell Providers

- [ ] 8.1 Create `AuthProvider.test.tsx`
- [ ] 8.2 Test: login flow integration (POST, setAccessToken, state update)
- [ ] 8.3 Test: logout flow integration (POST, clear, state update)
- [ ] 8.4 Test: AUTH_LOGOUT event triggers logout
- [ ] 8.5 Test: initialize with existing session (refreshToken on mount)
- [ ] 8.6 Test: window.**AUTH** is exposed correctly
- [ ] 8.7 Mock fetch for API calls
- [ ] 8.8 Mock tokenManager methods
- [ ] 8.9 Run tests and verify coverage >70%

**Depends on**: Section 6  
**Owner**: Frontend developer  
**Estimate**: 4-5 hours

---

## 9. Write Unit Tests for Shell Utilities

- [ ] 9.1 Create `navigation.test.ts`
- [ ] 9.2 Test: navigateTo emits mfe:navigate event
- [ ] 9.3 Test: navigateTo includes path in payload
- [ ] 9.4 Test: navigateTo includes state when provided
- [ ] 9.5 Test: navigateTo includes replace flag when provided

**Depends on**: Section 6  
**Owner**: Frontend developer  
**Estimate**: 1 hour

---

## 10. Configure MFE Testing (apps/mfes/mfe-widget)

- [ ] 10.1 Create `apps/mfes/mfe-widget/vitest.config.ts`
- [ ] 10.2 Configure happy-dom environment
- [ ] 10.3 Add @vitejs/plugin-react to config
- [ ] 10.4 Set coverage thresholds (70/65/70/70)
- [ ] 10.5 Add test scripts to `apps/mfes/mfe-widget/package.json`
- [ ] 10.6 Create `apps/mfes/mfe-widget/src/test/` directory
- [ ] 10.7 Create `apps/mfes/mfe-widget/src/test/setup.ts`
- [ ] 10.8 Create `apps/mfes/mfe-widget/src/test/utils.tsx`
- [ ] 10.9 Create `apps/mfes/mfe-widget/src/test/mocks.ts`

**Depends on**: Section 1  
**Owner**: Frontend developer  
**Estimate**: 2 hours

---

## 11. Write Unit Tests for MFE Components

- [ ] 11.1 Create `WidgetDashboard.test.tsx`
- [ ] 11.2 Test: displays user name when user prop provided
- [ ] 11.3 Test: handles null user gracefully
- [ ] 11.4 Test: renders navigation links
- [ ] 11.5 Create `CounterWidget.test.tsx`
- [ ] 11.6 Test: increments counter on button click
- [ ] 11.7 Test: decrements counter on button click

**Depends on**: Section 10  
**Owner**: Frontend developer  
**Estimate**: 2-3 hours

---

## 12. Write Unit Tests for MFE Utilities

- [ ] 12.1 Create `apiClient.test.ts`
- [ ] 12.2 Test: injects auth token from window.**AUTH**
- [ ] 12.3 Test: handles missing window.**AUTH** gracefully
- [ ] 12.4 Test: 401 triggers auto-retry with new token
- [ ] 12.5 Test: 401 retry prevents infinite loop
- [ ] 12.6 Test: non-401 errors do not retry
- [ ] 12.7 Mock window.**AUTH** global
- [ ] 12.8 Mock axios responses
- [ ] 12.9 Create `navigation.test.ts`
- [ ] 12.10 Test: navigateTo emits event
- [ ] 12.11 Test: setupAuthListeners registers event listeners

**Depends on**: Section 10  
**Owner**: Frontend developer  
**Estimate**: 3-4 hours

---

## 13. Write Integration Tests for MFE App

- [ ] 13.1 Create `App.test.tsx`
- [ ] 13.2 Test: renders dashboard when authenticated
- [ ] 13.3 Test: receives isAuthenticated prop correctly
- [ ] 13.4 Test: receives user prop correctly
- [ ] 13.5 Test: setupAuthListeners is called on mount
- [ ] 13.6 Test: internal routing works (MemoryRouter)
- [ ] 13.7 Mock window.**AUTH**
- [ ] 13.8 Run tests and verify coverage >70%

**Depends on**: Section 10  
**Owner**: Frontend developer  
**Estimate**: 2-3 hours

---

## 14. Add Root-Level Test Scripts

- [ ] 14.1 Add `test` script to root package.json (watch mode)
- [ ] 14.2 Add `test:run` script (run once)
- [ ] 14.3 Add `test:coverage` script (with coverage)
- [ ] 14.4 Add `test:ui` script (Vitest UI)
- [ ] 14.5 Configure Turborepo to run tests in parallel
- [ ] 14.6 Test that `pnpm test` runs all tests
- [ ] 14.7 Test that `pnpm test:coverage` generates report

**Depends on**: Sections 2-13  
**Owner**: Frontend developer  
**Estimate**: 1 hour

---

## 15. Documentation and Examples

- [ ] 15.1 Create `docs/TESTING.md`
- [ ] 15.2 Document test file naming conventions
- [ ] 15.3 Document test utilities (renderWithAuth, mockUser)
- [ ] 15.4 Add example unit test
- [ ] 15.5 Add example integration test
- [ ] 15.6 Add example component test
- [ ] 15.7 Document how to run tests locally
- [ ] 15.8 Document coverage thresholds
- [ ] 15.9 Document mock patterns

**Depends on**: Sections 2-13  
**Owner**: Frontend developer  
**Estimate**: 2 hours

---

## 16. CI/CD Integration (Future)

- [ ] 16.1 Add test step to GitHub Actions workflow
- [ ] 16.2 Configure test coverage upload (Codecov)
- [ ] 16.3 Add PR status check for test passage
- [ ] 16.4 Configure parallel test execution in CI

**Depends on**: Section 14  
**Owner**: DevOps  
**Estimate**: 2-3 hours  
**Status**: Deferred (CI/CD setup not in this change scope)

---

## Summary

**Total Tasks**: 116 tasks across 16 sections  
**Estimated Time**: 35-45 hours  
**Critical Path**: Dependencies → Config → Tests → Documentation  
**Parallel Work**: Shell tests (Sections 6-9) and MFE tests (Sections 10-13) can run in parallel after Section 1

**Testing Coverage Breakdown**:

- packages/auth: 10 unit tests (~80% coverage)
- packages/events: 9 unit tests (~80% coverage)
- apps/shells/website: ~25 tests (unit + integration, ~70% coverage)
- apps/mfes/mfe-widget: ~15 tests (unit + integration, ~70% coverage)

**Total Test Files**: ~15-20 test files
