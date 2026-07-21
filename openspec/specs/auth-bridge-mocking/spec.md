# auth-bridge-mocking Specification

## Purpose

TBD - created by archiving change mvp-test-environment-fixes. Update Purpose after archive.

## Requirements

### Requirement: Test helper exports MFEAuthBridge mock factory

Test utilities SHALL export a factory function `createMockAuthBridge()` that returns an object matching the MFEAuthBridge contract for use in unit and integration tests.

#### Scenario: Mock bridge has all required methods

- **WHEN** test calls `const bridge = createMockAuthBridge()`
- **THEN** bridge object has methods: `getAccessToken()`, `isAuthenticated()`, `login()`, `logout()`, `onAuthChange()`

#### Scenario: Mock bridge methods are spyable

- **WHEN** test wraps mock methods with vi.spy()
- **THEN** spy can assert which methods were called, how many times, and with what arguments

#### Scenario: Mock bridge token state is controllable

- **WHEN** test calls `bridge.setToken('test-token')` or similar helper
- **THEN** subsequent `bridge.getAccessToken()` returns that token and `bridge.isAuthenticated()` returns true

---

### Requirement: Test setup correctly assigns bridge to window.**MFE_AUTH**

Test setup utilities SHALL assign the mock bridge to `window.__MFE_AUTH__` before each test and clean up after.

#### Scenario: Bridge available before test runs

- **WHEN** test begins execution
- **THEN** `window.__MFE_AUTH__` is already assigned and ready to use (no manual assignment needed in test)

#### Scenario: Bridge cleaned up between tests

- **WHEN** one test finishes and next test begins
- **THEN** previous test's mock state is reset and new test gets fresh bridge (no state leakage)

#### Scenario: Bridge persists across async operations

- **WHEN** test awaits an async operation that uses `window.__MFE_AUTH__`
- **THEN** bridge is still accessible and maintains its state across the await

---

### Requirement: EventBus integration with auth bridge

Test fixtures SHALL wire EventBus to emit auth events when bridge methods are called, matching production behavior.

#### Scenario: Login emits mfe:auth:login event

- **WHEN** test calls `window.__MFE_AUTH__.login({ email: 'test@example.com' })`
- **THEN** EventBus emits event on channel `mfe:auth:login` with payload `{ user: {...}, accessToken: 'token' }`

#### Scenario: Logout emits mfe:auth:logout event

- **WHEN** test calls `window.__MFE_AUTH__.logout()`
- **THEN** EventBus emits event on channel `mfe:auth:logout`

#### Scenario: Token refresh emits mfe:auth:refresh event

- **WHEN** test simulates token refresh via `bridge.setToken(newToken)`
- **THEN** EventBus emits event on channel `mfe:auth:refresh` with new token payload

---

### Requirement: MFE tests can consume and verify auth events

MFE tests SHALL be able to listen for EventBus events emitted by the auth bridge and verify their MFE code responds correctly.

#### Scenario: MFE component updates when login event emitted

- **WHEN** test renders MFE component and emits `mfe:auth:login` event from EventBus
- **THEN** component updates to show authenticated UI (e.g., user menu visible)

#### Scenario: MFE component logs out when logout event emitted

- **WHEN** test emits `mfe:auth:logout` event
- **THEN** component clears user state and returns to anonymous UI

#### Scenario: MFE updates on token refresh without re-login

- **WHEN** test emits `mfe:auth:refresh` event with new token
- **THEN** MFE's local auth state updates but user is not logged out/in again (seamless refresh)

---
