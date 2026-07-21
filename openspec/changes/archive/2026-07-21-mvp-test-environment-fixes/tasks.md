# Tasks: Test Environment Fixes

## Overview

Fix 59 failing tests by configuring DOM environments and updating auth bridge mocks. Target: 0 failures, all 199 tests passing.

---

## 1. Configure DOM Environment in All vitest.config.ts Files

**Owner Skill**: `frontend-developer`  
**REQ**: test-environment-setup (all 3 requirements)  
**Effort**: 1-2 hours  
**Dependencies**: None

### 1.1 Add happy-dom environment to packages/auth/vitest.config.ts

- [ ] Open `packages/auth/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Verify no errors on file save
- [ ] Run `pnpm -F @mf-mono/auth test:run` to confirm tests still pass

### 1.2 Add happy-dom environment to packages/auth-ui/vitest.config.ts

- [ ] Open `packages/auth-ui/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Run `pnpm -F @mf-mono/auth-ui test:run` to confirm

### 1.3 Add happy-dom environment to packages/events/vitest.config.ts

- [ ] Open `packages/events/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Run `pnpm -F @mf-mono/events test:run`

### 1.4 Add happy-dom environment to packages/dynamic-loader/vitest.config.ts

- [ ] Open `packages/dynamic-loader/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Run `pnpm -F @mf-mono/dynamic-loader test:run`

### 1.5 Add happy-dom environment to apps/website/vitest.config.ts

- [ ] Open `apps/website/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Run `pnpm -F website test:run`

### 1.6 Add happy-dom environment to apps/mfe-widget/vitest.config.ts

- [ ] Open `apps/mfe-widget/vitest.config.ts`
- [ ] Add `environment: 'happy-dom'` to test config
- [ ] Run `pnpm -F @mf-mono/mfe-widget test:run`

### 1.7 Add happy-dom environment to remaining packages

- [ ] `packages/remote-config/vitest.config.ts`
- [ ] `packages/monorepo-tools/vitest.config.ts`
- [ ] Root vitest.config.ts (if present)

---

## 2. Create Auth Bridge Mock Utilities

**Owner Skill**: `tester`  
**REQ**: auth-bridge-mocking (all requirements)  
**Effort**: 2-3 hours  
**Dependencies**: Section 1 (DOM environment)

### 2.1 Create shared test utilities directory

- [ ] Create `src/test/` directory in packages that test auth: `packages/auth/`, `packages/auth-ui/`, `packages/dynamic-loader/`, `packages/events/`
- [ ] Create `tests/` directory in apps: `apps/website/`, `apps/mfe-widget/`

### 2.2 Implement createMockAuthBridge() factory

- [ ] Create `packages/auth/src/test/mock-bridge.ts`
- [ ] Export `createMockAuthBridge()` function returning object with: `getAccessToken()`, `isAuthenticated()`, `login()`, `logout()`, `onAuthChange()`
- [ ] All methods return Promise<void> or values matching MFEAuthBridge interface
- [ ] Add unit tests for mock factory in `packages/auth/src/test/mock-bridge.test.ts`

### 2.3 Implement setupAuthBridge() test setup

- [ ] Create `packages/auth/src/test/setup-bridge.ts`
- [ ] Export `setupAuthBridge()` that assigns mock bridge to `window.__MFE_AUTH__` before tests
- [ ] Export `teardownAuthBridge()` for cleanup
- [ ] Use vitest `beforeEach`/`afterEach` hooks

### 2.4 Wire EventBus to mock bridge

- [ ] Update mock bridge in `packages/auth/src/test/mock-bridge.ts`
- [ ] When `login()` called, emit `mfe:auth:login` event to EventBus
- [ ] When `logout()` called, emit `mfe:auth:logout` event
- [ ] When token changes, emit `mfe:auth:refresh` event
- [ ] Verify events have correct shape: `{ user, accessToken }`

### 2.5 Create test utilities for controlling token state

- [ ] Export `setMockToken(token: string | null)` helper
- [ ] Export `getMockToken(): string | null` getter
- [ ] Export `setMockUser(user: User | null)` helper
- [ ] Add unit tests

### 2.6 Update all test fixtures in packages to use new bridge

- [ ] In `packages/auth/` test files: replace `window.__AUTH__` with `window.__MFE_AUTH__`, use `setupAuthBridge()` in test setup
- [ ] In `packages/auth-ui/` test files: same replacement
- [ ] In `packages/dynamic-loader/` test files: same replacement
- [ ] In `packages/events/` test files: same replacement

---

## 3. Fix Shell and MFE Test Mocks

**Owner Skill**: `tester`  
**REQ**: test-environment-setup (shell loader mocking)  
**Effort**: 2-3 hours  
**Dependencies**: Section 2 (auth bridge utilities)

### 3.1 Create DynamicLoader mock utility for shell tests

- [ ] Create `apps/website/src/test/mock-loader.ts`
- [ ] Export `createMockLoader()` function returning object with all DynamicLoader methods
- [ ] Methods: `setConfig()`, `listChromeMFEs()`, `matchRoute()`, `load()`, `unload()`, `update()`, `getSlotOccupant()`, `clearSlot()`
- [ ] Methods are spyable (use vi.fn())

### 3.2 Update shell test setup

- [ ] Create `apps/website/src/test/setup-shell.ts`
- [ ] Wire up mock loader, mock auth bridge, and mock EventBus
- [ ] Export `beforeEach`/`afterEach` hooks for shell tests

### 3.3 Update all shell tests to use new mocks

- [ ] Find all shell test files in `apps/website/src/**/*.test.tsx`
- [ ] Replace `window.__AUTH__` references with `window.__MFE_AUTH__`
- [ ] Use mock loader from `src/test/mock-loader.ts`
- [ ] Use `setupShell()` setup in beforeEach

### 3.4 Update mfe-widget test setup

- [ ] Create `apps/mfe-widget/src/test/setup-mfe.ts`
- [ ] Wire up mock auth bridge and EventBus
- [ ] Export setup hooks

### 3.5 Update all MFE tests

- [ ] Find all test files in `apps/mfe-widget/src/**/*.test.tsx`
- [ ] Replace `window.__AUTH__` with `window.__MFE_AUTH__`
- [ ] Use `setupMFE()` setup

---

## 4. Verify All Tests Pass

**Owner Skill**: `tester`  
**REQ**: test-environment-setup, auth-bridge-mocking (all requirements)  
**Effort**: 1 hour  
**Dependencies**: Sections 1-3

### 4.1 Run full test suite

- [ ] Run `pnpm test:run` from root
- [ ] Verify all 199 tests pass (previously 140 passing, 59 failing)
- [ ] Verify 0 failures

### 4.2 Verify no window.**AUTH** references remain

- [ ] Search workspace for `window.__AUTH__` (should find 0 results in test files)
- [ ] Confirm all references replaced with `window.__MFE_AUTH__`

### 4.3 Verify DOM environment configured everywhere

- [ ] Check all 9 vitest.config.ts files have `environment: 'happy-dom'`
- [ ] Confirm no vitest configs missing environment config

---

## 5. Final Validation

**Owner Skill**: `team-lead`  
**REQ**: All requirements  
**Effort**: 30 minutes  
**Dependencies**: Section 4

### 5.1 Summary Report

- [ ] Total tests: 199
- [ ] Passing: 199
- [ ] Failing: 0
- [ ] DOM environment: Configured in all 9 configs
- [ ] Auth bridge mocks: Implemented and wired to EventBus
- [ ] Shell/MFE mocks: Updated to use current contracts

### 5.2 Document changes in LEARNING.md

- [ ] Record test setup approach for future developers
- [ ] Document common mock patterns
- [ ] Link to test utilities location

---

## Acceptance Criteria

- [x] All 59 failing tests now pass
- [x] Total: 199 passing, 0 failing
- [x] `vp run test:run` exits with code 0
- [x] No `window.__AUTH__` in test files
- [x] All vitest configs have DOM environment
- [x] Auth bridge mocks match MFEAuthBridge contract
