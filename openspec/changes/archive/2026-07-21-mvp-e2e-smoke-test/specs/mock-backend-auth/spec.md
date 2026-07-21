# Mock Backend Auth

## ADDED Requirements

### Requirement: Mock auth backend provides working endpoints for E2E tests

The test infrastructure SHALL include a mock backend (via MSW or test server) that provides functional `/api/auth/*` endpoints matching production behavior.

#### Scenario: Mock backend starts before E2E test

- **WHEN** Playwright test runs
- **THEN** mock backend is initialized and listening before shell loads

#### Scenario: Login endpoint validates email/password

- **WHEN** test calls POST `/api/auth/login` with `{ email: 'test@example.com', password: 'password' }`
- **THEN** endpoint validates credentials and returns JWT token if valid

#### Scenario: Login endpoint rejects invalid credentials

- **WHEN** test calls POST `/api/auth/login` with wrong password
- **THEN** endpoint returns 401 Unauthorized with error message

#### Scenario: Refresh token in HttpOnly cookie

- **WHEN** login succeeds
- **THEN** response includes `Set-Cookie` header with HttpOnly, Secure, SameSite flags and refresh token

#### Scenario: Token payload includes user claims

- **WHEN** test decodes JWT from login response
- **THEN** payload includes `{ sub, email, iat, exp, roles: [] }`

#### Scenario: Refresh endpoint returns valid new token

- **WHEN** test calls POST `/api/auth/refresh` with HttpOnly refresh cookie
- **THEN** endpoint returns `{ accessToken: <new-jwt>, expiresIn: 900 }`

#### Scenario: Logout invalidates token

- **WHEN** test calls POST `/api/auth/logout`
- **THEN** endpoint returns 204 and token cache is cleared on mock server side

---

### Requirement: Protected endpoints verify Bearer token

Mock API endpoints SHALL verify Bearer token in Authorization header and return 401 if missing or invalid.

#### Scenario: Protected endpoint without token returns 401

- **WHEN** test makes GET `/api/widgets` without Authorization header
- **THEN** endpoint returns 401 Unauthorized

#### Scenario: Protected endpoint with expired token returns 401

- **WHEN** test makes GET `/api/widgets` with `Authorization: Bearer <expired-token>`
- **THEN** endpoint returns 401 Unauthorized

#### Scenario: Protected endpoint with valid token returns 200

- **WHEN** test makes GET `/api/widgets` with `Authorization: Bearer <valid-token>`
- **THEN** endpoint returns 200 with sample data (e.g., empty array or mock widgets)

---

## Impact

- **Test isolation**: Fully isolated from production auth system
- **Test speed**: Mock backend adds <100ms overhead
- **Maintenance**: Mock must be updated if auth contract changes (unlikely)
- **Alternative**: Could use real Keycloak test instance (slower, more fragile)
- **Choice rationale**: MSW or test server chosen for speed and reliability
