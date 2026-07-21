# e2e-smoke-test Specification

## Purpose

TBD - created by archiving change mvp-e2e-smoke-test. Update Purpose after archive.

## Requirements

### Requirement: Playwright E2E test covers MVP user journey

A single end-to-end Playwright test SHALL validate the complete MVP flow: login → navigate to `/widget` → make authenticated API call → logout → redirect to `/login`.

#### Scenario: Unauthenticated user redirected to login

- **WHEN** user navigates to shell at `http://localhost:5173`
- **THEN** unauthenticated user is redirected to `/login` page

#### Scenario: User can login with email/password

- **WHEN** user fills email and password form and clicks login
- **THEN** POST `/api/auth/login` is called and shell receives accessToken and sets HttpOnly cookie

#### Scenario: Shell loads mfe-widget after login

- **WHEN** after successful login, shell bootstraps
- **THEN** shell loads `mfe-widget` from `http://localhost:5174` and mounts it in main-slot

#### Scenario: MFE can read auth context from window.**MFE_AUTH**

- **WHEN** mfe-widget renders and accesses auth state
- **THEN** `window.__MFE_AUTH__.getAccessToken()` returns valid token and `isAuthenticated()` is true

#### Scenario: MFE makes authenticated API call

- **WHEN** mfe-widget component makes a GET request (e.g., `GET /api/widgets`)
- **THEN** request includes `Authorization: Bearer <token>` header

#### Scenario: User can logout

- **WHEN** user clicks logout button in shell UI
- **THEN** POST `/api/auth/logout` is called and token is cleared from memory

#### Scenario: After logout user redirected to login

- **WHEN** logout completes
- **THEN** user is redirected to `/login` page and `window.__MFE_AUTH__.isAuthenticated()` is false

---

### Requirement: Mock backend provides test endpoints

Test infrastructure SHALL provide mock endpoints for `/api/auth/login`, `/api/auth/refresh`, and `/api/auth/logout` to enable E2E testing without real Keycloak.

#### Scenario: Mock login endpoint returns JWT token

- **WHEN** test makes POST `/api/auth/login` with `{ email: 'test@example.com', password: 'password' }`
- **THEN** endpoint returns `{ accessToken: <jwt>, user: { email, id }, expiresIn: 900 }`

#### Scenario: Mock refresh endpoint returns new token

- **WHEN** test sends POST `/api/auth/refresh` with HttpOnly cookie
- **THEN** endpoint returns `{ accessToken: <new-jwt>, expiresIn: 900 }`

#### Scenario: Mock logout endpoint clears session

- **WHEN** test sends POST `/api/auth/logout`
- **THEN** endpoint returns 204 and cookie is cleared

#### Scenario: Mock API endpoint requires Bearer token

- **WHEN** test makes GET `/api/widgets` without token
- **THEN** endpoint returns 401 Unauthorized

#### Scenario: Mock API endpoint accepts Bearer token

- **WHEN** test makes GET `/api/widgets` with `Authorization: Bearer <token>`
- **THEN** endpoint returns 200 with sample data

---
