## MODIFIED Requirements

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
