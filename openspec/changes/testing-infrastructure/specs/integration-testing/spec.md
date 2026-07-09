# Spec: Integration Testing

## ADDED Requirements

### Requirement: AuthProvider Integration Tests
The system SHALL have integration tests for AuthProvider with TokenManager.

#### Scenario: Login flow integration
- **WHEN** `AuthProvider.login({ email, password })` is called
- **THEN** POST request is made to `/api/auth/login`
- **AND** `tokenManager.setAccessToken()` is called with response token
- **AND** `isAuthenticated` state becomes true
- **AND** `user` state is populated with response data
- **AND** AUTH_LOGIN event is emitted

#### Scenario: Logout flow integration
- **WHEN** `AuthProvider.logout()` is called
- **THEN** POST request is made to `/api/auth/logout`
- **AND** `tokenManager.clear()` is called
- **AND** `isAuthenticated` state becomes false
- **AND** `user` state becomes null
- **AND** AUTH_LOGOUT event is emitted with reason "user_initiated"

#### Scenario: Auto-refresh triggers state update
- **WHEN** TokenManager emits AUTH_REFRESH event
- **THEN** AuthProvider continues to show authenticated state
- **AND** no UI re-render occurs
- **AND** next API call uses new token

#### Scenario: Refresh failure triggers logout
- **WHEN** TokenManager emits AUTH_LOGOUT event with reason "refresh_failed"
- **THEN** `isAuthenticated` state becomes false
- **AND** window.location.href is set to "/login"

#### Scenario: Initialize with existing session
- **WHEN** AuthProvider mounts
- **AND** valid refresh cookie exists
- **THEN** `tokenManager.refreshToken()` is called
- **AND** user is authenticated without explicit login

---

### Requirement: Event Bus Integration Tests
The system SHALL have integration tests for event bus communication across boundaries.

#### Scenario: Shell emits event, MFE receives
- **WHEN** shell emits `emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { user })`
- **THEN** MFE listener registered with `onMFEEvent(AUTH_LOGIN, handler)` is called
- **AND** handler receives user payload

#### Scenario: MFE emits event, shell receives
- **WHEN** MFE emits `emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/" })`
- **THEN** shell NavigationEventListener handler is called
- **AND** React Router navigates to "/"

#### Scenario: Event cleanup prevents memory leaks
- **WHEN** MFE component mounts and registers event listener
- **AND** component unmounts
- **THEN** cleanup function removes listener
- **AND** emitted events no longer trigger unmounted handler

#### Scenario: Multiple MFEs listening to same event
- **WHEN** two MFEs register listeners for AUTH_LOGOUT
- **AND** AUTH_LOGOUT is emitted
- **THEN** both MFE handlers are called

---

### Requirement: API Client Integration Tests
The system SHALL have integration tests for API client with auth and retry logic.

#### Scenario: Request includes auth token
- **WHEN** API client makes GET request
- **AND** `window.__AUTH__.getAccessToken()` returns "token123"
- **THEN** request includes header `Authorization: Bearer token123`

#### Scenario: 401 triggers auto-retry
- **WHEN** API client makes GET request
- **AND** first response is 401 Unauthorized
- **AND** TokenManager refreshes token to "newToken"
- **THEN** request is retried with `Authorization: Bearer newToken`
- **AND** second request succeeds

#### Scenario: 401 retry prevents infinite loop
- **WHEN** API client makes GET request
- **AND** first response is 401
- **AND** retry also returns 401
- **THEN** error is thrown
- **AND** request is NOT retried again

#### Scenario: Non-401 errors do not retry
- **WHEN** API client makes GET request
- **AND** response is 500 Internal Server Error
- **THEN** error is thrown immediately
- **AND** request is NOT retried

---

### Requirement: MFE App Integration Tests
The system SHALL have integration tests for MFE app-level behavior.

#### Scenario: MFE receives auth props
- **WHEN** MFE App is rendered with `isAuthenticated={true}` and `user={mockUser}`
- **THEN** WidgetDashboard displays user name
- **AND** protected features are accessible

#### Scenario: MFE auth event listeners are registered
- **WHEN** MFE App mounts
- **THEN** `setupAuthListeners()` is called
- **AND** listeners for AUTH_LOGOUT and AUTH_REFRESH are registered

#### Scenario: MFE internal routing works
- **WHEN** user clicks "Counter Widget" link
- **THEN** MemoryRouter navigates to `/counter`
- **AND** CounterPage is rendered

#### Scenario: MFE navigation event emits correctly
- **WHEN** user clicks "Navigate to Home" button in MFE
- **THEN** `emitMFEEvent(NAVIGATE, { path: "/" })` is called
- **AND** event payload includes correct path

---

### Requirement: Shell Routing Integration Tests
The system SHALL have integration tests for shell routing with MFE integration.

#### Scenario: Protected route guards unauthenticated access
- **WHEN** router navigates to "/widget"
- **AND** `useAuth()` returns `isAuthenticated: false`
- **THEN** ProtectedRoute redirects to "/login"
- **AND** location state includes return URL "/widget"

#### Scenario: Protected route allows authenticated access
- **WHEN** router navigates to "/widget"
- **AND** `useAuth()` returns `isAuthenticated: true`
- **THEN** MFEWidget component is rendered
- **AND** no redirect occurs

#### Scenario: Login redirects to return URL
- **WHEN** user logs in via Login page
- **AND** location.state includes `from: { pathname: "/widget" }`
- **THEN** navigate is called with "/widget"
- **AND** replace flag is true

---

### Requirement: Config Service Integration Tests
The system SHALL have integration tests for config service with runtime and build-time config.

#### Scenario: Runtime config takes precedence
- **WHEN** `window.__RUNTIME_CONFIG__` exists with `apiBaseUrl: "https://prod.api"`
- **AND** `import.meta.env.VITE_API_BASE_URL` is "https://dev.api"
- **THEN** `config.apiBaseUrl` returns "https://prod.api"

#### Scenario: Build-time config as fallback
- **WHEN** `window.__RUNTIME_CONFIG__` is undefined
- **AND** `import.meta.env.VITE_API_BASE_URL` is "https://dev.api"
- **THEN** `config.apiBaseUrl` returns "https://dev.api"

#### Scenario: Default fallback when both missing
- **WHEN** `window.__RUNTIME_CONFIG__` is undefined
- **AND** `import.meta.env.VITE_API_BASE_URL` is undefined
- **THEN** `config.apiBaseUrl` returns default fallback value

---

### Requirement: Error Boundary Integration Tests
The system SHALL have integration tests for error boundaries with retry logic.

#### Scenario: Error boundary catches component error
- **WHEN** child component throws error during render
- **THEN** error boundary catches error
- **AND** fallback UI is displayed
- **AND** error is logged

#### Scenario: Error boundary retry resets error
- **WHEN** error boundary displays fallback UI
- **AND** user clicks "Retry" button
- **THEN** error state is cleared
- **AND** child component re-renders

#### Scenario: Error boundary prevents app crash
- **WHEN** MFE component throws error
- **THEN** shell continues to function
- **AND** navigation to other routes works
- **AND** only failed MFE shows error UI

---

### Requirement: Test Data Management
The system SHALL provide utilities for managing test data and mocks.

#### Scenario: Mock user factory
- **WHEN** test needs a user object
- **THEN** `createMockUser()` returns valid user with defaults
- **AND** properties can be overridden

#### Scenario: Mock API responses
- **WHEN** test needs to mock API response
- **THEN** `mockApiResponse("/users", mockData)` intercepts requests
- **AND** returns mockData for matching endpoint

#### Scenario: Mock auth state
- **WHEN** test needs authenticated context
- **THEN** `renderWithAuth({ isAuthenticated: true, user: mockUser })` wraps component
- **AND** useAuth() returns mocked values

---

### Requirement: Integration Test Execution
The system SHALL execute integration tests efficiently.

#### Scenario: Integration test suite execution time
- **WHEN** integration tests are run
- **THEN** full suite completes in < 60 seconds

#### Scenario: Integration tests run in isolation
- **WHEN** integration tests run
- **THEN** each test gets fresh providers
- **AND** no test state leaks to next test

---

### Requirement: Async Testing Support
The system SHALL properly handle asynchronous operations in tests.

#### Scenario: Wait for async state updates
- **WHEN** test triggers async action
- **THEN** `waitFor()` utility waits for state update
- **AND** test assertions run after update completes

#### Scenario: Mock async API calls
- **WHEN** component makes API call
- **THEN** mock resolves/rejects as configured
- **AND** component updates accordingly

#### Scenario: Timeout handling
- **WHEN** async operation takes too long
- **THEN** test fails with timeout error after 5 seconds
- **AND** error message indicates which assertion timed out
