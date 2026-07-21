## ADDED Requirements

### Requirement: Protected Routes Require Authentication

The system SHALL prevent unauthenticated users from accessing protected routes.

#### Scenario: Authenticated user accesses protected route

- **WHEN** authenticated user navigates to /widgets
- **THEN** route guard checks isAuthenticated
- **AND** guard allows navigation
- **AND** MFE component renders

#### Scenario: Unauthenticated user redirected to login

- **WHEN** unauthenticated user navigates to /widgets
- **THEN** route guard checks isAuthenticated (false)
- **AND** guard prevents navigation
- **AND** system redirects to /login?redirect=/widgets
- **AND** MFE component does not render

#### Scenario: Session restored during protected route access

- **WHEN** user navigates to protected route during app boot
- **AND** auth provider is still initializing session
- **THEN** route guard waits for auth initialization
- **AND** if session valid, user proceeds to protected route
- **AND** if session invalid, user redirected to login

---

### Requirement: ProtectedRoute Component

The system SHALL provide ProtectedRoute wrapper for route guards.

#### Scenario: ProtectedRoute renders children when authenticated

- **WHEN** route is wrapped with `<ProtectedRoute><MFE /></ProtectedRoute>`
- **AND** user is authenticated
- **THEN** children components render normally

#### Scenario: ProtectedRoute redirects when not authenticated

- **WHEN** route is wrapped with `<ProtectedRoute><MFE /></ProtectedRoute>`
- **AND** user is not authenticated
- **THEN** ProtectedRoute renders Navigate to login
- **AND** current path saved as redirect parameter

---

### Requirement: Loading State During Auth Check

The system SHALL show loading indicator while checking authentication status.

#### Scenario: Loading spinner shown during auth initialization

- **WHEN** app boots and auth provider is checking for existing session
- **THEN** isLoading state is true
- **AND** protected routes show loading spinner
- **AND** routes do not redirect prematurely

#### Scenario: Routes render after auth check completes

- **WHEN** auth initialization completes
- **THEN** isLoading becomes false
- **AND** routes render based on authentication result

---

### Requirement: Public Routes Accessible Without Auth

The system SHALL allow unauthenticated access to public routes.

#### Scenario: Unauthenticated user accesses home page

- **WHEN** unauthenticated user navigates to /
- **THEN** route does not require authentication
- **AND** page renders without redirect

#### Scenario: Unauthenticated user accesses login page

- **WHEN** unauthenticated user navigates to /login
- **THEN** login page renders
- **AND** no redirect occurs

---

### Requirement: Optional MFE Auth Gating

The system SHALL support MFEs that require authentication and MFEs that are public.

#### Scenario: Public MFE loaded without auth

- **WHEN** shell loads MFE marked as public
- **THEN** MFE renders without auth check
- **AND** MFE receives auth prop as undefined

#### Scenario: Protected MFE requires auth

- **WHEN** shell loads MFE marked as protected
- **THEN** route guard checks authentication first
- **AND** only authenticated users can access MFE
