# route-guards Specification

## Purpose

This specification defines how the shell enforces authentication and role-based authorization before mounting a feature micro-frontend. Guard checks run in the vanilla bootstrap/navigation handlers against `tokenManager` state and the `requiresAuth`/`requiredRoles` metadata declared per feature in `remotes.config.json`; there are no React guard components in the shell.

## Requirements

### Requirement: Shell SHALL enforce authentication at route level

The shell SHALL enforce route-level authentication during bootstrap and on every navigation event. Authentication decisions SHALL come from `tokenManager.isAuthenticated()` and manifest metadata (`requiresAuth: boolean`) rather than React guard components.

**(Previously: Authentication was enforced via a `<ProtectedRoute>` React component wrapping React Router routes)**

**Reason for change**: Shell no longer renders React (ADR-0004, thin-shell-bootstrap capability). Guard logic moves into the vanilla bootstrap and navigation handlers, so no MFE mounts occur for unauthorized users.

#### Scenario: Authenticated user accesses protected route

- **GIVEN** the user has a valid session (refresh cookie honored by `tokenManager.initialize()`)
- **AND** manifest entry `features["/widget"]` has `requiresAuth: true`
- **WHEN** the user navigates to `/widget/list`
- **THEN** the shell SHALL confirm `window.__MFE_AUTH__.isAuthenticated()` returns `true`
- **AND** the shell SHALL load `mfe-widget` into `main-slot`
- **AND** the shell SHALL pass current `user` in the MFE lifecycle props

#### Scenario: Unauthenticated user redirected to login

- **GIVEN** the user has no valid session
- **AND** manifest entry `features["/widget"]` has `requiresAuth: true`
- **WHEN** the user navigates to `/widget/list`
- **THEN** the shell SHALL detect missing authentication before mounting any MFE
- **AND** the shell SHALL redirect the browser to `/login?returnUrl=/widget/list`
- **AND** the shell SHALL NOT mount `mfe-widget`

#### Scenario: Public route accessible without authentication

- **GIVEN** manifest entry `features["/marketing"]` has `requiresAuth: false`
- **AND** the user has no valid session
- **WHEN** the user navigates to `/marketing`
- **THEN** the shell SHALL mount the MFE mapped to `/marketing`
- **AND** the shell SHALL NOT redirect
- **AND** `window.__MFE_AUTH__.isAuthenticated()` SHALL return `false` to the MFE

#### Scenario: Route missing `requiresAuth` metadata

- **GIVEN** manifest entry for a route does not specify `requiresAuth`
- **WHEN** the user navigates to that route
- **THEN** the shell SHALL default to `requiresAuth: true` (secure by default)
- **AND** the shell SHALL apply the same redirect behavior as an explicit `requiresAuth: true`

---

### Requirement: Shell SHALL enforce authorization at route level

The shell SHALL enforce role-based authorization during bootstrap and on every navigation event, using role metadata (`requiredRoles: string[]`) declared per feature in the manifest.

**(Previously: Authorization was enforced via a `<ProtectedRoute requiredRole="admin">` React component)**

**Reason for change**: Same as authentication — shell no longer renders React, so authorization is enforced by the vanilla bootstrap using manifest metadata and token claims.

#### Scenario: Authorized user accesses role-protected route

- **GIVEN** the user is authenticated with role `admin` in their access token
- **AND** manifest entry `features["/admin"]` has `requiredRoles: ["admin"]`
- **WHEN** the user navigates to `/admin/dashboard`
- **THEN** the shell SHALL verify at least one required role is present on the user
- **AND** the shell SHALL mount `mfe-admin` into `main-slot`

#### Scenario: Unauthorized user denied role-protected route

- **GIVEN** the user is authenticated with role `user` only
- **AND** manifest entry `features["/admin"]` has `requiredRoles: ["admin"]`
- **WHEN** the user navigates to `/admin/dashboard`
- **THEN** the shell SHALL detect missing role
- **AND** the shell SHALL render a static `Access denied` placeholder into `main-slot`
- **AND** the shell SHALL NOT mount `mfe-admin`
- **AND** the browser URL SHALL remain unchanged

#### Scenario: Route with no role restriction

- **GIVEN** manifest entry does not specify `requiredRoles` (or defines empty array)
- **WHEN** an authenticated user (any role) visits the route
- **THEN** the shell SHALL allow access
- **AND** the shell SHALL mount the matching MFE

### Requirement: Guards SHALL run before MFE loading

Authentication and authorization checks SHALL execute before initiating MFE module loading.

#### Scenario: Guard rejects before MFE fetch

- **GIVEN** user is unauthenticated
- **AND** route `/products/*` requires authentication
- **WHEN** user navigates to `/products/list`
- **THEN** shell SHALL check authentication FIRST
- **AND** SHALL redirect to login
- **AND** SHALL NOT call dynamic loader
- **AND** network SHALL NOT fetch mfe-products remoteEntry.js

#### Scenario: Guard passes and MFE loads

- **GIVEN** user is authenticated
- **AND** route guard passes
- **WHEN** guard completes successfully
- **THEN** shell SHALL proceed to load MFE
- **AND** dynamic loader SHALL fetch remote module
- **AND** MFE SHALL render

---

### Requirement: Guards SHALL support async validation

Route guards SHALL be able to perform asynchronous checks (e.g., API calls).

#### Scenario: Async guard validates session with API

- **GIVEN** route `/dashboard/*` requires active session
- **AND** guard needs to verify session with API call
- **WHEN** user navigates to `/dashboard/overview`
- **THEN** shell SHALL call session validation API
- **AND** SHALL show loading indicator during validation
- **AND** SHALL allow route access if API returns 200
- **AND** SHALL redirect to login if API returns 401

#### Scenario: Guard times out after delay

- **GIVEN** route guard makes API call to validate permissions
- **AND** API does not respond within 5 seconds
- **WHEN** timeout is reached
- **THEN** shell SHALL treat validation as failed
- **AND** SHALL show error message
- **AND** SHALL NOT allow route access

---

### Requirement: Guards SHALL preserve navigation intent

When guards redirect unauthenticated users, the system SHALL preserve the original destination.

#### Scenario: User redirected and returned after login

- **GIVEN** user attempts to access `/products/123`
- **AND** is redirected to `/auth/login?redirect=/products/123`
- **WHEN** user successfully logs in
- **THEN** shell SHALL read `redirect` parameter
- **AND** SHALL navigate to `/products/123`
- **AND** SHALL load mfe-products with correct route

#### Scenario: Redirect parameter sanitized for security

- **GIVEN** user attempts to access `/products/list`
- **AND** is redirected to login with `redirect=/products/list`
- **WHEN** redirect URL is processed
- **THEN** shell SHALL validate redirect is internal path
- **AND** SHALL reject external URLs (e.g., `http://evil.com`)
- **AND** SHALL only allow redirects within the application

---

### Requirement: Guards SHALL be composable and reusable

Route guards SHALL be defined as reusable functions that can be combined.

#### Scenario: Route uses multiple guards

- **GIVEN** route `/admin/users` has guards:
  - requireAuth (check authentication)
  - requireRole("admin") (check authorization)
- **WHEN** user navigates to `/admin/users`
- **THEN** shell SHALL execute requireAuth guard first
- **AND** SHALL execute requireRole guard if first passes
- **AND** SHALL allow access only if ALL guards pass

#### Scenario: Guard fails early in chain

- **GIVEN** route has guards [requireAuth, requireRole("admin")]
- **AND** user is NOT authenticated
- **WHEN** guards execute
- **THEN** requireAuth SHALL fail immediately
- **AND** requireRole SHALL NOT execute
- **AND** user SHALL be redirected to login

#### Scenario: Guards defined once, used on multiple routes

- **GIVEN** guard function `requireAuth` is defined
- **WHEN** defining routes
- **THEN** `requireAuth` SHALL be reusable on multiple routes
- **AND** `/products/*`, `/checkout/*`, `/dashboard/*` SHALL all use same guard
- **AND** guard logic SHALL be centralized (not duplicated)

---

### Requirement: Guards SHALL integrate with loader functions

Route guards SHALL work seamlessly with React Router loader functions.

#### Scenario: Guard in loader function

- **GIVEN** route loader function contains guard logic
- **WHEN** route is accessed
- **THEN** loader SHALL execute guard
- **AND** SHALL throw redirect if guard fails
- **AND** React Router SHALL handle redirect automatically

#### Scenario: Guard passes data to loader

- **GIVEN** guard validates user and extracts user data
- **WHEN** guard passes
- **THEN** guard SHALL return user data
- **AND** loader SHALL receive user data
- **AND** loader MAY use user data to fetch resources

---

### Requirement: Guard failures SHALL render appropriate error UI

Different guard failures SHALL result in different user-facing messages.

#### Scenario: Authentication failure shows login prompt

- **GIVEN** user fails authentication guard
- **WHEN** guard rejects navigation
- **THEN** user SHALL be redirected to `/auth/login`
- **AND** SHALL see login form
- **AND** SHALL see message "Please log in to continue"

#### Scenario: Authorization failure shows 403 error

- **GIVEN** user is authenticated but fails role check
- **WHEN** guard rejects navigation
- **THEN** user SHALL see 403 Forbidden page
- **AND** SHALL see message "You don't have permission to access this page"
- **AND** SHALL NOT be redirected to login

#### Scenario: Guard error shows generic error

- **GIVEN** guard throws unexpected error (e.g., network failure)
- **WHEN** error occurs
- **THEN** shell SHALL catch error
- **AND** SHALL show error boundary
- **AND** SHALL log error details for debugging
- **AND** SHALL NOT crash the application

---

### Requirement: Guards SHALL be testable in isolation

Route guard functions SHALL be pure functions that can be unit tested.

#### Scenario: Guard tested with mock user

- **GIVEN** guard function `requireRole("admin")`
- **WHEN** tested with mock user `{ roles: ["admin"] }`
- **THEN** test SHALL assert guard returns true
- **AND** SHALL NOT require full routing context

#### Scenario: Guard tested for redirect behavior

- **GIVEN** guard function `requireAuth`
- **WHEN** tested with unauthenticated user
- **THEN** test SHALL assert guard throws redirect to `/auth/login`
- **AND** SHALL verify redirect includes original path

---

### Requirement: Guards SHALL support custom validation logic

Applications SHALL be able to define custom guard logic beyond auth/authz.

#### Scenario: Custom guard checks feature flag

- **GIVEN** route `/beta-features/*` has custom guard checking feature flag
- **AND** user has `betaAccess: false`
- **WHEN** user navigates to `/beta-features/new-ui`
- **THEN** guard SHALL check feature flag
- **AND** SHALL deny access
- **AND** SHALL show "Feature not available" message

#### Scenario: Custom guard validates time-based access

- **GIVEN** route `/reports/*` has guard checking business hours
- **AND** current time is outside business hours (e.g., 2 AM)
- **WHEN** user navigates to `/reports/daily`
- **THEN** guard SHALL check current time
- **AND** SHALL deny access
- **AND** SHALL show "Reports available during business hours" message
