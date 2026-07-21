## ADDED Requirements

### Requirement: User Login

The system SHALL allow users to authenticate with email and password credentials.

#### Scenario: Successful login with valid credentials

- **WHEN** user submits valid email and password to login form
- **THEN** system calls POST /api/auth/login with credentials
- **AND** system receives access token and refresh token (HttpOnly cookie)
- **AND** system stores access token in memory
- **AND** system fetches user profile
- **AND** system redirects to originally requested page or home

#### Scenario: Login fails with invalid credentials

- **WHEN** user submits incorrect email or password
- **THEN** system returns HTTP 401 error
- **AND** system displays error message "Invalid email or password"
- **AND** user remains on login page
- **AND** no tokens are stored

#### Scenario: Login fails with missing fields

- **WHEN** user submits form with empty email or password
- **THEN** system displays validation error
- **AND** login request is not sent to backend

#### Scenario: Login fails due to network error

- **WHEN** user submits valid credentials but network request fails
- **THEN** system displays error message "Unable to connect. Please try again."
- **AND** user can retry login

---

### Requirement: User Logout

The system SHALL allow authenticated users to end their session.

#### Scenario: Successful logout

- **WHEN** authenticated user clicks logout button
- **THEN** system calls POST /api/auth/logout
- **AND** system clears access token from memory
- **AND** backend clears refresh token HttpOnly cookie
- **AND** system redirects to login page
- **AND** subsequent API calls do not include authentication

#### Scenario: Logout when already logged out

- **WHEN** unauthenticated user attempts logout
- **THEN** system handles gracefully without errors
- **AND** user is redirected to login page

---

### Requirement: Session Initialization on App Boot

The system SHALL attempt to restore user session when application loads.

#### Scenario: Valid session restored on boot

- **WHEN** application loads and valid refresh token cookie exists
- **THEN** system calls POST /api/auth/refresh
- **AND** system receives new access token
- **AND** system stores access token in memory
- **AND** system fetches user profile
- **AND** system renders authenticated app state
- **AND** user sees their content without re-login

#### Scenario: No session on boot

- **WHEN** application loads without refresh token cookie
- **THEN** system renders unauthenticated state
- **AND** system redirects to login page for protected routes

#### Scenario: Invalid session on boot

- **WHEN** application loads with expired or invalid refresh token
- **THEN** system fails to refresh access token
- **AND** system clears any stored tokens
- **AND** system redirects to login page

---

### Requirement: User Profile Display

The system SHALL display authenticated user information in the UI.

#### Scenario: Show user name in header

- **WHEN** user is authenticated
- **THEN** system displays user's name or email in navigation bar
- **AND** user can access logout option from user menu

#### Scenario: Hide user info when logged out

- **WHEN** user is not authenticated
- **THEN** system does not display user profile information
- **AND** system shows login button instead

---

### Requirement: Redirect After Login

The system SHALL redirect users to their original destination after successful login.

#### Scenario: User redirected to protected page after login

- **WHEN** unauthenticated user navigates to /widgets
- **THEN** system redirects to /login?redirect=/widgets
- **AND** after successful login, system redirects to /widgets

#### Scenario: User redirected to home if no original destination

- **WHEN** user directly visits /login and successfully authenticates
- **THEN** system redirects to home page (/)
