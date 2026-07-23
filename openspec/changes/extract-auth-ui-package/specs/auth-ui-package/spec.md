## ADDED Requirements

### Requirement: Package SHALL provide a customizable `LoginPage` component

The `@mfe-runtine/auth-ui` package SHALL export a React `LoginPage` component that renders a corporate-branded login form and delegates authentication to `TokenManager` from `@mfe-runtine/auth`.

#### Scenario: Login succeeds with default branding

- **GIVEN** a shell renders `<LoginPage onLoginSuccess={handler} />` at route `/login`
- **AND** the user enters valid corporate credentials
- **WHEN** the user submits the form
- **THEN** the component SHALL call `tokenManager.login({ email, password })`
- **AND** on success the component SHALL invoke `onLoginSuccess` with the decoded user
- **AND** the component SHALL not persist any token in `localStorage` or `sessionStorage`

#### Scenario: Login fails with invalid credentials

- **GIVEN** the user submits credentials that Keycloak rejects
- **WHEN** the login request returns HTTP 401
- **THEN** the component SHALL display an inline error message next to the form
- **AND** the component SHALL NOT invoke `onLoginSuccess`
- **AND** the component SHALL leave the email field pre-filled and the password field empty

#### Scenario: Custom logo and primary color are honored

- **GIVEN** the shell renders `<LoginPage logo="/customer-logo.svg" primaryColor="#1e40af" />`
- **WHEN** the component mounts
- **THEN** the rendered logo `src` attribute SHALL be `/customer-logo.svg`
- **AND** the primary button background color SHALL be `#1e40af`

#### Scenario: Additional fields are rendered and submitted

- **GIVEN** the shell renders `<LoginPage additionalFields={[{ name: 'department', label: 'Department' }]} />`
- **WHEN** the user submits the form with `department = "Engineering"`
- **THEN** the payload passed to `tokenManager.login` SHALL include `department: "Engineering"`

#### Scenario: Return URL preserved after successful login

- **GIVEN** the browser URL is `/login?returnUrl=/widget`
- **WHEN** login succeeds and `onLoginSuccess` is invoked
- **THEN** the consumer's callback SHALL receive both the user AND a `returnUrl` string from the query parameters

#### Scenario: Locked account error displayed

- **GIVEN** the login request returns HTTP 423 (locked) or a Keycloak-specific `account_locked` code
- **WHEN** the component receives the error
- **THEN** the component SHALL display a locked-account message
- **AND** the component SHALL show a link to the forgot-password flow

---

### Requirement: Package SHALL expose an optional React `AuthProvider` context

The package SHALL export an `AuthProvider` component and `useAuth()` hook that expose auth state to React consumers via context, backed by the singleton `tokenManager`.

#### Scenario: `useAuth` reflects current auth state

- **GIVEN** a component tree wrapped in `<AuthProvider>`
- **AND** `tokenManager.isAuthenticated()` returns `true`
- **WHEN** a child component calls `useAuth()`
- **THEN** the returned object SHALL include `isAuthenticated: true`, the decoded `user`, and functions `login`, `logout`, `getAccessToken`

#### Scenario: `useAuth` updates on token change

- **GIVEN** a component using `useAuth()` is mounted with `isAuthenticated: false`
- **WHEN** `tokenManager` emits a successful refresh event
- **THEN** the component SHALL re-render with `isAuthenticated: true`
- **AND** the returned `user` SHALL reflect the newly decoded token

#### Scenario: Provider initializes auth on mount

- **GIVEN** a shell mounts `<AuthProvider>` at startup
- **WHEN** the provider effect runs
- **THEN** the provider SHALL call `tokenManager.initialize()` once
- **AND** the provider SHALL not re-initialize on remount within the same page load

---

### Requirement: Package SHALL expose a React Router `ProtectedRoute` guard

The package SHALL export a `ProtectedRoute` component that redirects unauthenticated visitors to `/login?returnUrl=<current>` and renders its children only when authenticated.

#### Scenario: Authenticated user sees protected content

- **GIVEN** the user is authenticated
- **AND** the shell renders `<ProtectedRoute><Widget /></ProtectedRoute>` at `/widget`
- **WHEN** the route mounts
- **THEN** the `<Widget />` children SHALL be rendered

#### Scenario: Unauthenticated user redirected to login with returnUrl

- **GIVEN** the user is unauthenticated
- **AND** the shell renders `<ProtectedRoute>` at path `/widget/list`
- **WHEN** the route mounts
- **THEN** the component SHALL trigger a React Router navigation to `/login?returnUrl=/widget/list`
- **AND** the protected children SHALL NOT render

#### Scenario: Role requirement enforced

- **GIVEN** the shell renders `<ProtectedRoute requiredRoles={['admin']}>` at `/admin`
- **AND** the user is authenticated but lacks the `admin` role
- **WHEN** the route mounts
- **THEN** the component SHALL render an accessible `Access denied` fallback
- **AND** the protected children SHALL NOT render

---

### Requirement: Package SHALL expose a framework-agnostic `setupAuthBridge` helper

The package SHALL export a `setupAuthBridge()` function that populates `window.__MFE_AUTH__` from the singleton `tokenManager`, matching the contract defined in ADR-0002.

#### Scenario: Bridge exposes required API

- **GIVEN** a vanilla shell bootstrap calls `setupAuthBridge()`
- **WHEN** the call completes
- **THEN** `window.__MFE_AUTH__` SHALL be an object containing `version`, `getToken`, `isAuthenticated`, `onTokenChange`, `logout`
- **AND** `window.__MFE_AUTH__.version` SHALL be the string `"1.0.0"`

#### Scenario: `onTokenChange` receives updates

- **GIVEN** an MFE calls `window.__MFE_AUTH__.onTokenChange(callback)`
- **WHEN** `tokenManager` emits a successful refresh
- **THEN** the callback SHALL be invoked with the new access token
- **AND** the callback subscription SHALL return a cleanup function that removes the listener

#### Scenario: `logout` clears session and fires event

- **GIVEN** an MFE calls `await window.__MFE_AUTH__.logout()`
- **WHEN** the call completes
- **THEN** `tokenManager.clearSession()` SHALL have been invoked
- **AND** a `mfe:auth:logout` custom event SHALL be dispatched on `window`
- **AND** subsequent `window.__MFE_AUTH__.isAuthenticated()` SHALL return `false`

#### Scenario: Bridge is idempotent

- **GIVEN** `setupAuthBridge()` has already been called during bootstrap
- **WHEN** a second call is made in the same page load
- **THEN** the second call SHALL be a no-op
- **AND** `window.__MFE_AUTH__` SHALL retain the original object reference (existing subscribers unaffected)

---

### Requirement: Package SHALL expose corporate branding tokens

The package SHALL export a `theme.ts` module and a set of CSS custom properties applied to a top-level wrapper, so pure vanilla shells can reuse corporate visuals without importing React.

#### Scenario: Theme tokens exported as JavaScript object

- **GIVEN** a consumer imports `theme` from `@mfe-runtine/auth-ui`
- **WHEN** the consumer reads `theme.colors.primary`
- **THEN** the value SHALL be a valid CSS color string
- **AND** the object SHALL include `colors.primary`, `colors.background`, `colors.error`, `fonts.body`, `radii.md`

#### Scenario: CSS variables applied by components

- **GIVEN** `<LoginPage />` is mounted with default theme
- **WHEN** the rendered DOM is inspected
- **THEN** the outermost element SHALL define CSS custom properties `--auth-primary`, `--auth-background`, `--auth-error`
- **AND** the button element SHALL use `var(--auth-primary)` for its background color

---

### Requirement: Package SHALL provide tree-shakeable subpath exports

The package SHALL provide subpath exports so consumers can import only the surface they need.

#### Scenario: Login subpath import

- **GIVEN** a shell imports `import { LoginPage } from '@mfe-runtine/auth-ui/login'`
- **WHEN** the bundler builds the shell
- **THEN** unused modules (`LogoutPage`, `ForgotPasswordPage`, `AuthProvider`, `setupAuthBridge`) SHALL NOT appear in the final shell bundle

#### Scenario: Bridge subpath import

- **GIVEN** a vanilla shell imports `import { setupAuthBridge } from '@mfe-runtine/auth-ui/bridge'`
- **WHEN** the bundler builds the shell
- **THEN** no React components SHALL be included in the final shell bundle
- **AND** React SHALL NOT be resolved as a dependency of the bridge import
