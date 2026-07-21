## Why

The MVP architecture (thin Shell + DynamicLoader + Feature MFE + auth bridge) is not validated end-to-end. A single smoke test covering the critical user journey (login → navigate to `/widget` → authenticated API call → logout) confirms the system works holistically before declaring MVP ready. Playwright provides lightweight browser automation suitable for MVP smoke validation.

## What Changes

- Create Playwright test that covers one complete user journey
- Journey: Unauthenticated → Login → Shell loads `mfe-widget` → MFE makes authenticated API call → Logout → Redirect to `/login`
- Test validates: TokenManager state changes, `window.__MFE_AUTH__` populated, MFE can read auth context, request includes Bearer token, logout clears token
- Setup: Mock backend auth endpoints with MSW (Mock Service Worker) or test HTTP server
- Run test in CI/CD as final MVP validation before release

## Capabilities

### New Capabilities

- `e2e-smoke-test`: Single end-to-end Playwright test covering MVP user journey
- `mock-backend-auth`: Test fixture providing mock `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout` endpoints

### Modified Capabilities

None

## Impact

- **Affected code**: New test file only; no changes to source code
- **Affected systems**: Test infrastructure, optional mock server
- **Dependencies**: Playwright (add if not present), MSW (optional) or Node http server
- **Breaking**: None
- **Test runtime**: ~10s per run
- **Target result**: Test passes; MVP journey validated

---

## Acceptance Criteria

- [ ] Playwright test created at `tests/e2e/mvp-smoke.spec.ts` (or appropriate location)
- [ ] Test covers: login → `/widget` load → authenticated API call → logout → redirect to `/login`
- [ ] All assertions pass: TokenManager state, auth bridge populated, Bearer token present, logout clears token
- [ ] Mock backend available (MSW or test server)
- [ ] Test passes locally: `pnpm test:e2e` or similar
- [ ] Test can run in CI/CD pipeline
- [ ] Success = MVP architecture proven end-to-end
