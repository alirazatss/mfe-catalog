## ADDED Requirements

### Requirement: Access Token Storage in Memory

The system SHALL store JWT access tokens in JavaScript memory only, never in localStorage or sessionStorage.

#### Scenario: Access token stored after login

- **WHEN** user successfully logs in
- **THEN** system stores access token in memory variable
- **AND** access token is NOT written to localStorage
- **AND** access token is NOT written to sessionStorage
- **AND** access token is NOT written to cookies

#### Scenario: Access token cleared on tab close

- **WHEN** user closes browser tab
- **THEN** access token is lost (garbage collected)
- **AND** user must re-authenticate on next visit (unless refresh token valid)

---

### Requirement: Refresh Token as HttpOnly Cookie

The system SHALL receive refresh tokens as HttpOnly cookies set by the backend.

#### Scenario: Refresh token received on login

- **WHEN** backend responds to POST /api/auth/login
- **THEN** backend sets refreshToken as HttpOnly cookie
- **AND** cookie has Secure flag (HTTPS only)
- **AND** cookie has SameSite=Strict flag
- **AND** cookie has 7-day expiry
- **AND** JavaScript cannot access refresh token value

#### Scenario: Refresh token sent automatically on refresh

- **WHEN** system calls POST /api/auth/refresh
- **THEN** browser automatically includes refresh token cookie
- **AND** no manual cookie handling required in JavaScript

---

### Requirement: Automatic Token Refresh

The system SHALL proactively refresh access tokens before they expire.

#### Scenario: Token refreshed at 80% lifetime

- **WHEN** access token has 15-minute lifetime
- **THEN** system schedules refresh after 12 minutes (80%)
- **AND** system calls POST /api/auth/refresh automatically
- **AND** system receives new access token
- **AND** system replaces old access token in memory

#### Scenario: Token refresh succeeds

- **WHEN** system calls POST /api/auth/refresh with valid HttpOnly cookie
- **THEN** backend returns HTTP 200 with new access token
- **AND** system stores new access token in memory
- **AND** user experiences no interruption

#### Scenario: Token refresh fails - session expired

- **WHEN** system calls POST /api/auth/refresh with expired refresh token
- **THEN** backend returns HTTP 401
- **AND** system clears access token from memory
- **AND** system emits 'auth:session-expired' event
- **AND** shell logs user out and redirects to login

---

### Requirement: Manual Token Refresh on 401 Response

The system SHALL attempt to refresh access token when API calls receive 401 Unauthorized.

#### Scenario: API call retried after token refresh

- **WHEN** MFE makes API call with expired access token
- **THEN** API returns HTTP 401
- **AND** Axios interceptor calls tokenManager.refreshAccessToken()
- **AND** token manager refreshes using HttpOnly cookie
- **AND** interceptor retries original request with new token
- **AND** request succeeds

#### Scenario: Refresh fails during 401 retry

- **WHEN** API call receives 401 and refresh token is also expired
- **THEN** token refresh call returns HTTP 401
- **AND** system clears access token
- **AND** system emits 'auth:session-expired' event
- **AND** original API call fails
- **AND** user is logged out

---

### Requirement: Token Manager Singleton

The system SHALL expose a shared TokenManager singleton used by shell and all MFEs.

#### Scenario: Shell initializes token manager

- **WHEN** shell application bootstraps
- **THEN** shell calls tokenManager.initialize() with refresh endpoint
- **AND** shell sets initial access token if available
- **AND** token manager is ready for MFE use

#### Scenario: MFE retrieves token from manager

- **WHEN** MFE needs access token for API call
- **THEN** MFE calls tokenManager.getAccessToken()
- **AND** token manager returns current access token from memory
- **AND** MFE includes token in Authorization header

#### Scenario: Multiple simultaneous refresh requests

- **WHEN** multiple MFEs make API calls that receive 401 simultaneously
- **THEN** token manager deduplicates refresh requests
- **AND** only one POST /api/auth/refresh call is made
- **AND** all waiting callers receive the same new token

---

### Requirement: Token Change Notifications

The system SHALL notify subscribers when access token changes or is cleared.

#### Scenario: Listeners notified on token update

- **WHEN** access token is refreshed
- **THEN** token manager calls all registered listeners
- **AND** listeners receive new token value

#### Scenario: Listeners notified on token clear (logout)

- **WHEN** user logs out
- **THEN** token manager calls all registered listeners with null
- **AND** MFEs can react by clearing local state

---

### Requirement: Token Expiry Scheduling

The system SHALL schedule proactive token refresh based on token expiry time.

#### Scenario: Expiry time received from backend

- **WHEN** backend returns access token with expiresIn: 900 (15 minutes)
- **THEN** token manager schedules refresh at 720 seconds (80% of 900)
- **AND** refresh happens automatically before token expires

#### Scenario: Refresh scheduled timeout cleared on logout

- **WHEN** user logs out
- **THEN** token manager clears any pending refresh timeout
- **AND** no automatic refresh attempts occur after logout
