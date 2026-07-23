# ADR-0003: Login Page as npm Package (Not MFE)

## Status

Accepted (2026-07-14)

## Context

Multiple shells share the same corporate branding for login. We need to decide whether the login page should be:

- Duplicated in each shell repo
- A separate MFE loaded from CDN
- An npm package imported by each shell

## Decision

**Login is a React component in `@mfe-runtine/auth-ui` npm package.**

Each shell imports and uses:

```typescript
import { LoginPage } from '@mfe-runtine/auth-ui';

<Route path="/login" element={<LoginPage />} />
```

## Alternatives Considered

### Alternative 1: Login as MFE

Deploy `mfe-login` to CDN, shell loads it dynamically.

**Rejected because:**

- **Bootstrap dependency**: Shell needs login BEFORE MFE loader is ready
- **Circular dependency**: Loading MFE requires auth state, auth requires login
- **CDN failure = locked out**: If CDN is down, users can't login
- **Reliability**: Login must be more reliable than feature MFEs
- **No versioning benefit**: Login is single flow, doesn't need independent versioning
- **Auth boundary violation**: Login MFE would need special shell privileges

### Alternative 2: Duplicate in Each Shell

Copy LoginPage.tsx to each shell repo (customer-shell, admin-shell, etc.)

**Rejected because:**

- 124 lines duplicated × N shells = maintenance nightmare
- Corporate branding inconsistencies between shells
- Bug fixes must be applied to every shell
- Feature additions (2FA, password reset) require N updates
- Testing must be repeated per shell

### Alternative 3: Git Submodule

Include shared login code via git submodule.

**Rejected because:**

- Submodules are notoriously painful to manage
- Team members frequently forget to sync
- CI/CD complications
- No semantic versioning
- IDE tooling issues

## Consequences

### Positive

- Corporate branding centralized in one place
- Single source of truth for login UI
- Testable in isolation (unit tests in package)
- Reliable (bundled with shell, no runtime dependency)
- Fast (no CDN loading delay for login)
- Each shell can customize via props/theme
- Bug fixes applied to package, all shells benefit
- Feature additions (OAuth, 2FA) added once

### Negative

- Shell must publish new version to consume login updates
- Login changes require npm publish + shell version bumps
- Package version drift possible if shells don't upgrade
- Slight bundle size increase per shell

### Neutral

- Different shells might want different login UX (future concern)
- Corporate rebranding requires package update

## Design

### Package Structure

```
@mfe-runtine/auth-ui/
├── src/
│   ├── LoginPage.tsx           ← Main login form
│   ├── LogoutPage.tsx          ← Logout confirmation
│   ├── SessionExpiredPage.tsx  ← Session timeout UI
│   ├── ForgotPasswordPage.tsx  ← Password reset flow
│   ├── components/             ← Shared UI components
│   ├── hooks/                  ← useAuth hook
│   ├── theme.ts                ← Corporate branding
│   └── types.ts
└── package.json
```

### Customization API

```typescript
// Shell can override branding/behavior via props
<LoginPage
  logo="/customer-logo.svg"
  primaryColor="#1e40af"
  onLoginSuccess={(user) => navigate('/dashboard')}
  additionalFields={[...]}  // Custom form fields
  socialProviders={['google', 'sso']}
/>
```

## Trade-offs

We accepted **npm package coupling** in exchange for:

- **Consistency**: Same login UI across all shells
- **Reliability**: No CDN dependency for login
- **Maintainability**: One codebase to update
- **Testability**: Standard npm package testing

## When to Revisit

Reconsider this decision if:

- Different shells need drastically different login flows
- Login becomes a business feature (not just utility)
- Corporate breaks into multiple brand identities
- SSO providers require MFE isolation for security
