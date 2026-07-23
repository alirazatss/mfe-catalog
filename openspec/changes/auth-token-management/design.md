## Context

The micro-frontend architecture currently has mock authentication that cannot be used in production. Real authentication requires:

1. **Secure token storage**: Access tokens must be memory-only (XSS protection), refresh tokens in HttpOnly cookies (immune to JavaScript theft)
2. **Centralized auth in shell**: Shell owns login/logout, MFEs are auth consumers
3. **Token propagation**: Standard pattern for shell to provide auth context to MFEs
4. **Automatic refresh**: Tokens expire quickly (15 min), system must refresh transparently
5. **Shared token manager**: Singleton prevents duplication and ensures consistency across MFEs

**Current State**:

- `apps/website/src/components/LoginPage.tsx` has mock login (sets localStorage token)
- No real auth provider or token management
- No integration with backend auth API
- MFEs have no standard way to receive auth tokens

**Constraints**:

- Backend will provide JWT-based auth with HttpOnly cookie refresh tokens
- Cannot use localStorage/sessionStorage for access tokens (XSS vulnerability)
- Must support multiple MFEs making concurrent authenticated requests
- Auth flow must work with existing React Router v8 navigation

**Stakeholders**:

- Frontend team implementing shell and MFEs
- Backend team providing auth API endpoints
- Security team requiring secure token handling

---

## Goals / Non-Goals

**Goals:**

- Implement production-ready authentication in shell application
- Create shared token management package (`@mfe-runtine/auth`)
- Establish standard pattern for passing auth from shell to MFEs
- Implement automatic token refresh before expiry
- Protect routes requiring authentication
- Provide Axios integration example for authenticated API calls
- Support session restoration on page reload

**Non-Goals:**

- OAuth/SSO integration (future enhancement)
- Multi-factor authentication (future enhancement)
- Role-based access control (RBAC) within MFEs (future)
- Auth UI component library (use existing styled components)
- Backend auth API implementation (out of scope - backend team)

---

## Decisions

### Decision 1: Access Tokens in Memory Only

**Choice**: Store access tokens in JavaScript variables, never in localStorage/sessionStorage/cookies.

**Rationale**:

- **XSS Protection**: If attacker injects JavaScript, they cannot persist access token
- **Short-lived exposure**: Token lost on tab close, limiting attack window
- **Industry best practice**: Auth0, Supabase, and OWASP recommend this approach

**Alternatives Considered**:

- ❌ **localStorage**: Vulnerable to XSS, token persists across sessions
- ❌ **sessionStorage**: Still vulnerable to XSS, only cleared on tab close
- ❌ **Regular cookies**: Can be stolen via XSS (unless HttpOnly, but then JavaScript can't read it)

**Trade-off**: User must re-login if they close tab (mitigated by long-lived refresh token).

---

### Decision 2: Refresh Tokens as HttpOnly Cookies

**Choice**: Backend sets refresh token as `HttpOnly; Secure; SameSite=Strict` cookie.

**Rationale**:

- **HttpOnly**: JavaScript cannot access, immune to XSS theft
- **Secure**: Only sent over HTTPS, prevents man-in-the-middle attacks
- **SameSite=Strict**: Prevents CSRF attacks
- **Automatic sending**: Browser includes cookie on refresh endpoint calls

**Alternatives Considered**:

- ❌ **Refresh token in localStorage**: Vulnerable to XSS
- ❌ **Refresh token in memory**: Lost on page reload, poor UX

**Trade-off**: Requires backend to support HttpOnly cookie setting.

---

### Decision 3: Shared Token Manager Singleton

**Choice**: Create `packages/auth` with `TokenManager` class, export singleton instance.

**Rationale**:

- **Single source of truth**: All MFEs and shell use same token
- **Prevents duplication**: Refresh logic centralized
- **Automatic updates**: Token refresh updates all consumers simultaneously
- **Deduplication**: Multiple simultaneous 401s trigger only one refresh call

**Alternatives Considered**:

- ❌ **Token manager per MFE**: Duplicates refresh logic, risk of inconsistent state
- ❌ **Props-only propagation**: Requires re-rendering all MFEs on token change

**Trade-off**: Introduces shared mutable state (singleton), but benefits outweigh risks.

---

### Decision 4: Proactive Token Refresh at 80% Lifetime

**Choice**: Automatically refresh access token at 80% of its expiry time.

**Rationale**:

- **Prevents 401 errors**: User never experiences failed requests due to expiry
- **Better UX**: No loading delays during critical operations
- **Industry standard**: 80% is common threshold (Auth0, Firebase use similar)

**Example**: 15-minute token refreshes after 12 minutes.

**Alternatives Considered**:

- ❌ **Refresh on 401 only (reactive)**: User experiences failed requests, then retry
- ❌ **Refresh every X minutes**: Ignores actual token lifetime, could refresh unnecessarily

**Trade-off**: Slightly more frequent refresh calls, but negligible performance impact.

---

### Decision 5: Props + Events for Auth Propagation

**Choice**: Pass auth to MFEs via props, use events for state changes.

**Rationale**:

- **Props**: Explicit dependency, type-safe, clear data flow
- **Events**: Decouple shell from MFEs, support logout/refresh notifications
- **Hybrid approach**: Combines benefits of both patterns

**Pattern**:

```typescript
// Props: Initial auth state
<WidgetMFE auth={{ token, user }} />

// Events: State changes
window.dispatchEvent(new CustomEvent('auth:logout'));
window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { token } }));
```

**Alternatives Considered**:

- ❌ **Props only**: Requires re-rendering MFEs on every token change (expensive)
- ❌ **Events only**: No type safety, harder to debug
- ❌ **Shared Context**: Doesn't work across Module Federation boundaries

**Trade-off**: MFEs must listen to events if they cache auth state.

---

### Decision 6: Axios Interceptors for Auth Integration

**Choice**: Use Axios request/response interceptors for token injection and 401 handling.

**Rationale**:

- **Separation of concerns**: Business logic doesn't handle auth
- **Automatic retry**: 401 triggers refresh + retry transparently
- **Consistent pattern**: All API calls get auth automatically

**Pattern**:

```typescript
// Request interceptor: Inject token
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${tokenManager.getAccessToken()}`;
  return config;
});

// Response interceptor: Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await tokenManager.refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config);
    }
    return Promise.reject(error);
  },
);
```

**Alternatives Considered**:

- ❌ **Manual token injection**: Every API call must manually add header (error-prone)
- ❌ **Higher-order functions**: More complex, harder to understand

**Trade-off**: Axios-specific (but 90% of apps use Axios or fetch with similar patterns).

---

### Decision 7: React Context for Shell Auth State

**Choice**: Use React Context API for auth state within shell application.

**Rationale**:

- **Standard React pattern**: Familiar to developers
- **Type-safe**: useAuth() hook provides IntelliSense
- **Centralized state**: Single AuthProvider component manages all auth logic

**Pattern**:

```typescript
<AuthProvider>
  <App />
</AuthProvider>

// In components:
const { user, isAuthenticated, login, logout } = useAuth();
```

**Alternatives Considered**:

- ❌ **Redux/Zustand**: Overkill for auth-only state
- ❌ **Props drilling**: Becomes unwieldy quickly

**Trade-off**: Context doesn't cross Module Federation boundaries (why we also use events).

---

## Risks / Trade-offs

### Risk 1: Access Token Lost on Page Reload

**Risk**: User refreshes page, access token in memory is lost.  
**Mitigation**: On app boot, immediately call POST /api/auth/refresh using HttpOnly cookie to get new access token. User stays logged in.

### Risk 2: Refresh Token Expires While User Active

**Risk**: User leaves tab open for 7+ days, refresh token expires.  
**Mitigation**:

- Proactive refresh extends session automatically while active
- Show "Your session has expired" modal, allow re-login without navigation
- Consider refresh token rotation (backend enhancement)

### Risk 3: Multiple MFEs Trigger Simultaneous Refresh

**Risk**: 3 MFEs all receive 401 at same time, trigger 3 refresh calls.  
**Mitigation**: Token manager deduplicates - first call creates promise, subsequent calls await same promise.

### Risk 4: Token Manager Not Initialized Before MFE Load

**Risk**: MFE tries to use tokenManager before shell initializes it.  
**Mitigation**:

- Shell initializes tokenManager in `main.tsx` before rendering routes
- Token manager gracefully returns `null` if not initialized
- MFEs should check token existence before API calls

### Risk 5: Security - XSS Could Still Access Memory Token

**Risk**: If XSS injected, attacker can call `tokenManager.getAccessToken()`.  
**Mitigation**:

- Token only valid for 15 minutes (limited exposure)
- CSP headers prevent most XSS vectors
- Refresh token in HttpOnly cookie cannot be stolen
- This is still better than localStorage (where token persists)

### Risk 6: Backend API Not Ready

**Risk**: Frontend ready before backend implements auth endpoints.  
**Mitigation**:

- Keep mock login page as fallback during development
- Use feature flag to switch between mock and real auth
- Document required backend contract clearly

---

## Migration Plan

### Phase 1: Create Token Manager Package

1. Create `packages/auth/` with TokenManager class
2. Export singleton instance
3. Write unit tests for token storage, refresh, and event emission

### Phase 2: Implement Shell Auth Provider

1. Create `AuthProvider.tsx` with React Context
2. Implement login/logout/refresh logic
3. Integrate with token manager
4. Update `main.tsx` to wrap app with provider

### Phase 3: Update Login Page

1. Replace mock logic with real POST /api/auth/login
2. Handle login errors and validation
3. Store tokens correctly (memory + HttpOnly cookie)
4. Test redirect after login

### Phase 4: Add Protected Routes

1. Create `ProtectedRoute.tsx` component
2. Wrap protected routes in `App.tsx`
3. Implement redirect to login with return URL
4. Test auth guarding

### Phase 5: Integrate MFE Example (mfe-widget)

1. Update `mfe-widget/src/App.tsx` to accept auth prop
2. Create `mfe-widget/src/api/client.ts` with Axios + interceptors
3. Update widget pages to use authenticated API client
4. Test token refresh and 401 handling

### Phase 6: Documentation

1. Document auth prop interface for MFE developers
2. Create auth integration guide
3. Document event-driven auth updates
4. Add troubleshooting section

### Rollback Strategy

- Keep mock authentication as feature flag fallback
- Can disable real auth and fall back to mock without code changes
- Token manager gracefully handles missing backend endpoints

---

## Open Questions

1. **Auth Provider Choice**: Should we use Auth0, Supabase, Firebase, or custom backend?
   - **Recommendation**: Start with custom backend for flexibility, consider Auth0 for enterprise

2. **Token Expiry Times**: What should access token and refresh token lifetimes be?
   - **Recommendation**: 15 min access, 7 day refresh (industry standard)

3. **Session Timeout**: Should we implement idle timeout (no activity for X minutes)?
   - **Decision**: Defer to v2, focus on token expiry first

4. **Remember Me**: Should login page have "remember me" checkbox?
   - **Decision**: Defer to v2, default 7-day refresh token is sufficient

5. **Logout Endpoint Behavior**: Should POST /api/auth/logout require authentication?
   - **Recommendation**: Yes, but handle 401 gracefully (already logged out)
