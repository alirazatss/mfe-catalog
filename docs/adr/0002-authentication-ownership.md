# ADR-0002: Authentication Ownership - Shell as Auth Provider

## Status

Accepted (2026-07-14)

## Context

We have multiple shells sharing a single Keycloak authentication system. MFEs need access to auth tokens to make authenticated API calls.

**The question:** Where should authentication logic live? In the shell, in each MFE, or in a shared runtime?

## Decision

**Shell owns authentication.** MFEs consume auth via a global bridge:

- Global API: `window.__MFE_AUTH__`
- Custom events: `mfe:auth:token-updated`

Auth logic is packaged as `@mf-mono/auth` (npm) - contains TokenManager class only, no UI.

## Alternatives Considered

### Alternative 1: Auth in Each MFE

Each MFE handles its own auth, has own tokenManager.

**Rejected because:**

- Multiple refresh cycles cause race conditions
- User must login multiple times (per MFE!)
- Each MFE needs backend endpoints for auth
- Duplication of auth code
- Security nightmare (tokens in multiple places)

### Alternative 2: Shared Singleton via Module Federation

Use MF's `shared: { singleton: true }` for `@mf-mono/auth`.

**Rejected because:**

- Version conflicts break silently
- Requires coordinated MF config across ALL apps
- Difficult to debug when it fails
- Shell might use v1.0, MFE loads with v2.0
- Not framework-agnostic (MFEs must use MF)

### Alternative 3: Global Window Object Only

`window.__AUTH__` with no npm package or documentation.

**Rejected because:**

- Not typed
- No version compatibility guarantee
- Hard to test
- Anti-pattern: undocumented global state

### Alternative 4: Auth as MFE

Login page and auth logic as separate MFE.

**Rejected because:**

- Bootstrap dependency issue (shell needs auth before MFE loader ready)
- Circular dependency: MFE loader needs auth, auth is MFE
- CDN failure = no login (users locked out)
- Auth boundary violation (needs deep shell access)

## Consequences

### Positive

- Single source of truth for auth state
- One refresh cycle across all MFEs
- Login once, works everywhere
- HttpOnly cookie scope matches shell domain
- Industry-proven pattern (Spotify, Zalando, DAZN, IKEA)
- MFEs are framework-agnostic (can use any framework)

### Negative

- Shell has more responsibility than pure "loader"
- MFEs must know about `window.__MFE_AUTH__` contract
- Version compatibility must be documented
- If shell has auth bug, all MFEs affected

### Neutral

- Each shell repo has its own AuthProvider (some duplication)
- Cross-shell SSO requires wildcard cookie domain
- MFEs must handle case where `window.__MFE_AUTH__` doesn't exist yet

## Contract Definition

### Global API

```typescript
window.__MFE_AUTH__ = {
  version: '1.0.0',
  getToken(): string | null,
  onTokenChange(callback: (token: string | null) => void): () => void,
  logout(): Promise<void>,
  isAuthenticated(): boolean,
}
```

### Events

```typescript
// Fired by shell when token updates
window.dispatchEvent(
  new CustomEvent("mfe:auth:token-updated", {
    detail: { token: string | null },
  }),
);
```

### Package Split

- `@mf-mono/auth` - TokenManager logic, JWT utils, types (no UI)
- `@mf-mono/auth-ui` - LoginPage, LogoutPage React components (corporate branding)

## Trade-offs

We accepted **shell owning auth** in exchange for:

- **Simplicity**: One place to debug auth issues
- **Security**: Tokens managed centrally
- **UX**: True SSO experience
- **Compatibility**: Framework-agnostic MFEs
