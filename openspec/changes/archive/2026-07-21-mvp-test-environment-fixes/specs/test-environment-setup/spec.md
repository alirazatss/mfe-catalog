# Test Environment Setup

## ADDED Requirements

### Requirement: DOM environment configured in all vitest.config.ts files

All vitest configuration files SHALL specify `environment: 'happy-dom'` (or equivalent) to enable DOM API access in component and integration tests.

#### Scenario: Component test can render React elements

- **WHEN** a test renders a React component using `react-dom/test-utils` or `@testing-library/react`
- **THEN** the test has access to DOM APIs (document, window, querySelector, etc.) without errors

#### Scenario: MFEAuthBridge mock can set global window properties

- **WHEN** a test sets up `window.__MFE_AUTH__` in a test fixture
- **THEN** the property persists across the test and is accessible from tested code

#### Scenario: Event listeners work in tests

- **WHEN** a test creates an EventListener on a DOM element
- **THEN** events emit and trigger callbacks without "undefined is not a function" errors

---

### Requirement: Test setup fixtures configured with correct shell auth context

Test utilities SHALL export fixtures that correctly initialize `window.__MFE_AUTH__` matching the current MFEAuthBridge contract.

#### Scenario: setupAuthBridge fixture populates window.**MFE_AUTH**

- **WHEN** a test calls `setupAuthBridge()` from test utilities
- **THEN** `window.__MFE_AUTH__` is populated with methods: `getAccessToken()`, `isAuthenticated()`, `login()`, `logout()`

#### Scenario: Test can mock token state

- **WHEN** a test calls `setMockToken({ accessToken: 'test-token', user: {...} })`
- **THEN** subsequent `window.__MFE_AUTH__.getAccessToken()` returns 'test-token' and `isAuthenticated()` returns true

#### Scenario: Auth events are emitted with correct shape

- **WHEN** a test triggers a login action
- **THEN** an event emitted to EventBus uses correct channel name `mfe:auth:login` (not `auth:login`) and payload is `{ user, accessToken }`

---

### Requirement: Shell test setup mocks DynamicLoader correctly

Shell tests SHALL mock DynamicLoader with complete lifecycle methods to enable testing of shell bootstrap and slot management.

#### Scenario: Shell bootstrap calls loader methods

- **WHEN** shell bootstrap executes
- **THEN** the mock DynamicLoader receives calls to `setConfig()`, `listChromeMFEs()`, and `matchRoute()`

#### Scenario: MFE load/unload lifecycle tracked

- **WHEN** a slot change occurs
- **THEN** mock DynamicLoader can assert that `load()`, `unload()`, or `update()` was called with correct MFE name and slot ID

#### Scenario: Test can verify slot occupant state

- **WHEN** after bootstrap completes
- **THEN** shell test can call `loader.getSlotOccupant('main-slot')` and verify it matches the feature MFE that should be loaded

---

## Impact

- **Test files affected**: All test files using DOM APIs (estimated 40+ files across packages/ and apps/)
- **vitest.config.ts files affected**: All 9 packages and apps
- **Test utilities affected**: Test setup in each package
- **Dependency additions**: None (happy-dom already in devDependencies)
- **Backward compatibility**: Existing tests without DOM setup will continue to work (no breaking changes)
