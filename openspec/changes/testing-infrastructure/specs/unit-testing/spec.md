# Spec: Unit Testing

## ADDED Requirements

### Requirement: Test File Naming Convention
The system SHALL follow consistent test file naming conventions.

#### Scenario: Component test file naming
- **WHEN** a component file exists at `src/components/Button.tsx`
- **THEN** its test file MUST be named `src/components/Button.test.tsx`

#### Scenario: Utility function test file naming
- **WHEN** a utility file exists at `src/utils/formatDate.ts`
- **THEN** its test file MUST be named `src/utils/formatDate.test.ts`

#### Scenario: Hook test file naming
- **WHEN** a hook file exists at `src/hooks/useDebounce.ts`
- **THEN** its test file MUST be named `src/hooks/useDebounce.test.ts`

---

### Requirement: TokenManager Unit Tests
The system SHALL have comprehensive unit tests for the TokenManager class.

#### Scenario: Set access token
- **WHEN** `setAccessToken("token123", 900)` is called
- **THEN** `getAccessToken()` returns "token123"
- **AND** auto-refresh timer is scheduled for 720 seconds (80% of 900s)

#### Scenario: Auto-refresh scheduling
- **WHEN** a token with 900 second expiry is set
- **THEN** `scheduleRefresh` calculates 80% lifetime (720s)
- **AND** timer fires at correct time

#### Scenario: JWT decoding
- **WHEN** `decodeJWT(validJWT)` is called
- **THEN** payload is extracted and parsed correctly
- **AND** exp claim is readable

#### Scenario: JWT decoding with invalid format
- **WHEN** `decodeJWT("invalid")` is called  
- **THEN** error is thrown with message "Invalid JWT format"

#### Scenario: Clear tokens
- **WHEN** `clear()` is called
- **THEN** `getAccessToken()` returns null
- **AND** auto-refresh timer is cancelled
- **AND** `isAuthenticated()` returns false

#### Scenario: Refresh token deduplication
- **WHEN** `refreshToken()` is called twice simultaneously
- **THEN** only one HTTP request is made
- **AND** both callers receive the same promise result

---

### Requirement: EventBus Unit Tests
The system SHALL have comprehensive unit tests for the EventBus class.

#### Scenario: Emit and listen to event
- **WHEN** listener is registered with `on("test-event", handler)`
- **AND** event is emitted with `emit("test-event", { data: "value" })`
- **THEN** handler is called with payload `{ data: "value" }`

#### Scenario: Once listener fires only once
- **WHEN** listener is registered with `once("test-event", handler)`
- **AND** event is emitted twice
- **THEN** handler is called only once

#### Scenario: Cleanup function removes listener
- **WHEN** listener is registered and cleanup function is called
- **AND** event is emitted
- **THEN** handler is NOT called

#### Scenario: Multiple listeners for same event
- **WHEN** two listeners are registered for "test-event"
- **AND** event is emitted
- **THEN** both handlers are called

#### Scenario: Type-safe event emission
- **WHEN** `emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { user, timestamp })` is called
- **THEN** event is emitted with correct event name
- **AND** payload matches MFEEventMap interface

---

### Requirement: Shell Component Unit Tests
The system SHALL have unit tests for shell components.

#### Scenario: ProtectedRoute redirects when not authenticated
- **WHEN** ProtectedRoute is rendered
- **AND** `useAuth()` returns `isAuthenticated: false`
- **THEN** component renders Navigate to "/login"
- **AND** children are NOT rendered

#### Scenario: ProtectedRoute renders children when authenticated
- **WHEN** ProtectedRoute is rendered
- **AND** `useAuth()` returns `isAuthenticated: true`
- **THEN** children are rendered
- **AND** no redirect occurs

#### Scenario: ProtectedRoute shows loading state
- **WHEN** ProtectedRoute is rendered
- **AND** `useAuth()` returns `isLoading: true`
- **THEN** loading indicator is displayed
- **AND** children are NOT rendered

#### Scenario: ProtectedRoute preserves return URL
- **WHEN** user accesses protected route while unauthenticated
- **THEN** Navigate component receives `state={{ from: location }}`
- **AND** return URL is preserved for post-login redirect

---

### Requirement: Shell Utility Unit Tests
The system SHALL have unit tests for shell utility functions.

#### Scenario: Navigation event emission
- **WHEN** `navigateTo("/dashboard")` is called
- **THEN** `mfe:navigate` event is dispatched
- **AND** event payload contains `{ path: "/dashboard" }`

#### Scenario: Navigation with state
- **WHEN** `navigateTo("/dashboard", { state: { id: 1 } })` is called
- **THEN** event payload contains `{ path: "/dashboard", state: { id: 1 } }`

#### Scenario: Navigation with replace flag
- **WHEN** `navigateTo("/dashboard", { replace: true })` is called
- **THEN** event payload contains `{ path: "/dashboard", replace: true }`

---

### Requirement: MFE Component Unit Tests
The system SHALL have unit tests for MFE components.

#### Scenario: WidgetDashboard displays user name
- **WHEN** WidgetDashboard is rendered with `user={{ name: "John Doe" }}`
- **THEN** text "Welcome, John Doe!" is displayed

#### Scenario: WidgetDashboard handles null user
- **WHEN** WidgetDashboard is rendered with `user={null}`
- **THEN** no welcome message is displayed
- **AND** component renders without error

#### Scenario: CounterWidget increments count
- **WHEN** counter button is clicked
- **THEN** count increments from 0 to 1

---

### Requirement: MFE Utility Unit Tests  
The system SHALL have unit tests for MFE utility functions.

#### Scenario: API client injects auth token
- **WHEN** `window.__AUTH__.getAccessToken()` returns "token123"
- **AND** API request is made
- **THEN** Authorization header is set to "Bearer token123"

#### Scenario: API client handles missing auth
- **WHEN** `window.__AUTH__` is undefined
- **AND** API request is made
- **THEN** Authorization header is NOT set
- **AND** request proceeds without error

#### Scenario: Navigation utility emits event
- **WHEN** `navigateTo("/counter")` is called in MFE
- **THEN** `emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/counter" })` is called

---

### Requirement: Test Coverage Thresholds
The system SHALL enforce minimum test coverage thresholds.

#### Scenario: Package coverage threshold
- **WHEN** tests are run for a package in `packages/`
- **THEN** statement coverage MUST be >= 80%
- **AND** branch coverage MUST be >= 75%
- **AND** function coverage MUST be >= 80%

#### Scenario: App coverage threshold
- **WHEN** tests are run for an app in `apps/`
- **THEN** statement coverage SHOULD be >= 70%
- **AND** branch coverage SHOULD be >= 65%

#### Scenario: Coverage failure blocks build
- **WHEN** test coverage is below threshold
- **THEN** test command exits with non-zero code
- **AND** error message indicates which coverage metric failed

---

### Requirement: Test Execution Speed
The system SHALL execute unit tests quickly to enable rapid feedback.

#### Scenario: Unit test suite execution time
- **WHEN** unit tests are run
- **THEN** full suite completes in < 30 seconds
- **AND** individual tests complete in < 100ms

#### Scenario: Watch mode incremental testing
- **WHEN** tests run in watch mode
- **AND** a single file changes
- **THEN** only affected tests re-run
- **AND** re-run completes in < 5 seconds

---

### Requirement: Test Isolation
The system SHALL ensure test isolation to prevent test pollution.

#### Scenario: Tests run in any order
- **WHEN** tests are run in random order
- **THEN** all tests pass
- **AND** no test depends on another test's side effects

#### Scenario: Mocks are reset between tests
- **WHEN** a test mocks `window.__AUTH__`
- **AND** next test runs
- **THEN** mock is cleared/reset
- **AND** next test starts with clean state

#### Scenario: DOM is cleaned between tests
- **WHEN** a component test renders DOM elements
- **AND** next test runs
- **THEN** previous DOM is unmounted
- **AND** document.body is empty

---

### Requirement: Test Debugging Support
The system SHALL provide debugging capabilities for failed tests.

#### Scenario: Test failure output
- **WHEN** a test fails
- **THEN** error message includes assertion details
- **AND** stack trace points to failing line
- **AND** actual vs expected values are shown

#### Scenario: Debug mode
- **WHEN** tests run with `--inspect` flag
- **THEN** debugger can attach to test process
- **AND** breakpoints work in test files

#### Scenario: UI component debugging
- **WHEN** a component test fails
- **THEN** rendered DOM is logged to console
- **AND** component props are visible in output
