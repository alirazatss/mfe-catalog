## Why

Production micro-frontends require secure authentication with centralized token management. Currently, the system has mock authentication that cannot be used in production. MFEs need a standardized way to receive authentication tokens and make authenticated API calls without implementing their own auth logic, which would create security vulnerabilities and code duplication.

## What Changes

- **Shell Auth System**: Implement real authentication provider in shell application with login/logout flows, JWT token management, and automatic token refresh
- **Token Manager Package**: Create shared `@mfe-runtine/auth` package managing access tokens in memory and refresh tokens via HttpOnly cookies
- **Auth Propagation**: Establish pattern for passing authentication context from shell to MFEs via props and events
- **Protected Routes**: Implement route guards in shell that require authentication before rendering MFEs
- **MFE Integration**: Update MFE examples to consume auth tokens for authenticated API calls using Axios interceptors
- **Session Management**: Handle token expiry, proactive refresh, and session timeout across all MFEs

## Capabilities

### New Capabilities

- `shell-authentication`: User login/logout flows, credential validation, and session initiation in shell application
- `token-management`: Memory-based access token storage, HttpOnly cookie refresh tokens, automatic token rotation, and expiry handling
- `auth-propagation`: Patterns for passing auth context from shell to MFEs via props and cross-MFE auth events
- `protected-routing`: Route guards requiring authentication before accessing shell routes and MFE lazy-loaded components
- `mfe-auth-integration`: Standard integration pattern for MFEs to consume shell auth and make authenticated API calls

### Modified Capabilities

- `module-federation-host`: Shell must initialize auth provider and pass auth context when loading MFEs
- `dynamic-loader`: Loader should support auth-gated MFE loading (optional: some MFEs public, some require auth)

## Impact

**Affected Code**:

- `apps/shells/website/src/main.tsx` — Wrap app with AuthProvider
- `apps/shells/website/src/components/LoginPage.tsx` — Replace mock login with real auth integration
- `apps/shells/website/src/App.tsx` — Add protected route guards, pass auth to MFEs
- `apps/mfes/mfe-widget/src/App.tsx` — Accept auth props, integrate with API client
- `apps/mfes/mfe-widget/src/api/` — Add Axios interceptors using shared token manager

**New Files**:

- `packages/auth/` — New package for shared token manager
- `apps/shells/website/src/providers/AuthProvider.tsx` — Auth context provider
- `apps/shells/website/src/hooks/useAuth.ts` — Auth hook for components
- `apps/shells/website/src/guards/ProtectedRoute.tsx` — Route guard component

**Infrastructure**:

- Backend API endpoints required: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`
- HttpOnly cookie configuration in backend (SameSite, Secure, HttpOnly flags)

**Breaking Changes**:

- **BREAKING**: LoginPage behavior changes from mock to real authentication
- **BREAKING**: MFEs must accept `auth` prop or use token manager to make authenticated requests
- **BREAKING**: Shell boot sequence adds auth initialization step (may delay initial render)
