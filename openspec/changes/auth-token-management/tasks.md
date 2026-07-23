## 1. Token Manager Package Setup

- [ ] 1.1 Create `packages/auth/` directory structure
- [ ] 1.2 Create `packages/auth/package.json` with dependencies (no external deps needed)
- [ ] 1.3 Create `packages/auth/tsconfig.json` extending base config
- [ ] 1.4 Add build script to `packages/auth/package.json`
- [ ] 1.5 Add `@mfe-runtine/auth` to workspace in `pnpm-workspace.yaml`

**Depends on**: None (starting point)  
**Skill**: Backend developer  
**Estimate**: 30 minutes

---

## 2. Token Manager Implementation

- [ ] 2.1 Create `packages/auth/src/tokenManager.ts` with TokenManager class
- [ ] 2.2 Implement `setAccessToken()` method storing token in memory
- [ ] 2.3 Implement `getAccessToken()` method returning current token
- [ ] 2.4 Implement `clearAccessToken()` method for logout
- [ ] 2.5 Implement `refreshAccessToken()` method calling POST /api/auth/refresh
- [ ] 2.6 Add refresh promise deduplication (prevent simultaneous refreshes)
- [ ] 2.7 Implement proactive refresh scheduling at 80% token lifetime
- [ ] 2.8 Add `clearRefreshTimeout()` helper to cancel scheduled refreshes
- [ ] 2.9 Implement listener pattern with `onTokenChange()` subscription
- [ ] 2.10 Implement `notifyListeners()` when token changes
- [ ] 2.11 Export singleton instance: `export const tokenManager = new TokenManager()`
- [ ] 2.12 Create `packages/auth/src/index.ts` exporting tokenManager and types

**Depends on**: Section 1 (package setup)  
**Skill**: Backend developer  
**Estimate**: 4-5 hours

---

## 3. Token Manager Unit Tests

- [ ] 3.1 Write test for `setAccessToken()` stores token in memory
- [ ] 3.2 Write test for `getAccessToken()` retrieves stored token
- [ ] 3.3 Write test for `clearAccessToken()` removes token
- [ ] 3.4 Write test for refresh deduplication (multiple simultaneous calls)
- [ ] 3.5 Write test for proactive refresh scheduling
- [ ] 3.6 Write test for listener notifications on token change
- [ ] 3.7 Write test for fetch failure handling in refresh
- [ ] 3.8 Mock fetch API for testing refresh endpoint calls

**Depends on**: Section 2 (token manager implemented)  
**Skill**: Tester  
**Estimate**: 2-3 hours

---

## 4. Shell Auth Provider Implementation

- [ ] 4.1 Create `apps/website/src/providers/AuthProvider.tsx`
- [ ] 4.2 Define AuthContext interface with user, isAuthenticated, isLoading, login, logout
- [ ] 4.3 Create AuthProvider component with React Context
- [ ] 4.4 Implement `initializeAuth()` on mount calling tokenManager.refreshAccessToken()
- [ ] 4.5 Implement `login()` function calling POST /api/auth/login
- [ ] 4.6 Store access token via tokenManager on successful login
- [ ] 4.7 Fetch user profile from /api/auth/me after token stored
- [ ] 4.8 Implement `logout()` function calling POST /api/auth/logout
- [ ] 4.9 Clear access token via tokenManager on logout
- [ ] 4.10 Implement `getAccessToken()` wrapper around tokenManager
- [ ] 4.11 Create `apps/website/src/hooks/useAuth.ts` hook for consuming context
- [ ] 4.12 Export useAuth hook from hooks directory

**Depends on**: Section 2 (token manager ready)  
**Skill**: Frontend developer  
**Estimate**: 3-4 hours

---

## 5. Shell Bootstrap Integration

- [ ] 5.1 Update `apps/website/src/main.tsx` to wrap app with AuthProvider
- [ ] 5.2 Initialize tokenManager before rendering app
- [ ] 5.3 Add loading state while auth initializes
- [ ] 5.4 Test session restoration on page reload

**Depends on**: Section 4 (auth provider implemented)  
**Skill**: Frontend developer  
**Estimate**: 1 hour

---

## 6. Login Page Implementation

- [ ] 6.1 Update `apps/website/src/components/LoginPage.tsx` to use useAuth hook
- [ ] 6.2 Replace mock login with auth.login(email, password)
- [ ] 6.3 Add form validation (email format, required fields)
- [ ] 6.4 Display login errors from auth provider
- [ ] 6.5 Implement redirect after successful login using searchParams
- [ ] 6.6 Add loading state during login request
- [ ] 6.7 Test login flow end-to-end (mock backend if needed)

**Depends on**: Section 4 (auth provider implemented)  
**Skill**: Frontend developer  
**Estimate**: 2-3 hours

---

## 7. Protected Route Implementation

- [ ] 7.1 Create `apps/website/src/guards/ProtectedRoute.tsx` component
- [ ] 7.2 Use useAuth hook to check isAuthenticated
- [ ] 7.3 Show loading spinner while isLoading is true
- [ ] 7.4 Redirect to /login with redirect param if not authenticated
- [ ] 7.5 Render children if authenticated
- [ ] 7.6 Update `apps/website/src/App.tsx` to wrap /widgets route with ProtectedRoute
- [ ] 7.7 Test unauthenticated access redirects to login
- [ ] 7.8 Test authenticated access renders MFE

**Depends on**: Section 4 (auth provider implemented)  
**Skill**: Frontend developer  
**Estimate**: 2 hours

---

## 8. Auth Propagation to MFEs

- [ ] 8.1 Update `apps/website/src/App.tsx` to pass auth prop to MFEs
- [ ] 8.2 Use useAuth() to get token and user in shell
- [ ] 8.3 Pass auth={{ token, user }} to lazy-loaded MFE components
- [ ] 8.4 Add TypeScript interface for auth prop structure
- [ ] 8.5 Test auth prop received correctly in mfe-widget

**Depends on**: Section 4 (auth provider implemented)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 9. Auth Events Implementation

- [ ] 9.1 Add event emission in AuthProvider on logout
- [ ] 9.2 Add event emission in tokenManager on token refresh
- [ ] 9.3 Add event emission on session expiry (refresh fails with 401)
- [ ] 9.4 Update `apps/website/src/App.tsx` to listen for 'auth:session-expired' event
- [ ] 9.5 Call auth.logout() when session expired event received
- [ ] 9.6 Test event-driven logout across MFEs

**Depends on**: Section 4 (auth provider implemented)  
**Skill**: Frontend developer  
**Estimate**: 1-2 hours

---

## 10. MFE Auth Integration (mfe-widget Example)

- [ ] 10.1 Update `apps/mfe-widget/src/App.tsx` interface to accept auth prop
- [ ] 10.2 Handle auth prop as optional (undefined for unauthenticated)
- [ ] 10.3 Create `apps/mfe-widget/src/api/client.ts` with Axios instance
- [ ] 10.4 Add Axios request interceptor using tokenManager.getAccessToken()
- [ ] 10.5 Add Axios response interceptor for 401 handling
- [ ] 10.6 Implement token refresh on 401 in interceptor
- [ ] 10.7 Emit 'auth:session-expired' event if refresh fails
- [ ] 10.8 Configure Axios with withCredentials: true for cookies
- [ ] 10.9 Export configured Axios instance for use in widget pages
- [ ] 10.10 Update widget pages to use api client for sample API calls

**Depends on**: Sections 2, 8 (token manager + auth propagation)  
**Skill**: Frontend developer  
**Estimate**: 3-4 hours

---

## 11. Testing & Validation

- [ ] 11.1 Test full login flow (enter credentials → logged in → MFE loads)
- [ ] 11.2 Test logout flow (click logout → redirected to login → MFE unloads)
- [ ] 11.3 Test session restoration (reload page → still logged in)
- [ ] 11.4 Test protected route guard (access /widgets logged out → redirect to login)
- [ ] 11.5 Test redirect after login (access /widgets → login → back to /widgets)
- [ ] 11.6 Test token refresh (wait 12+ minutes → token refreshed → API still works)
- [ ] 11.7 Test 401 handling (expire token → API call → token refreshed → retry succeeds)
- [ ] 11.8 Test session expiry (expire refresh token → API call → logout triggered)
- [ ] 11.9 Test concurrent API calls trigger single refresh
- [ ] 11.10 Verify access token not in localStorage/sessionStorage

**Depends on**: All previous sections  
**Skill**: Tester  
**Estimate**: 3-4 hours

---

## 12. Documentation

- [ ] 12.1 Document auth prop interface in README
- [ ] 12.2 Create auth integration guide for MFE developers
- [ ] 12.3 Document required backend API endpoints
- [ ] 12.4 Document HttpOnly cookie requirements
- [ ] 12.5 Add troubleshooting section (common auth errors)
- [ ] 12.6 Document token manager usage patterns
- [ ] 12.7 Add sequence diagram for token refresh flow

**Depends on**: Section 11 (testing complete)  
**Skill**: Technical writer or frontend developer  
**Estimate**: 2-3 hours

---

## Total Effort Estimate

- **Setup**: ~30 minutes
- **Token Manager**: ~4-5 hours
- **Tests**: ~2-3 hours
- **Shell Auth**: ~3-4 hours
- **Shell Integration**: ~1 hour
- **Login Page**: ~2-3 hours
- **Protected Routes**: ~2 hours
- **Auth Propagation**: ~1-2 hours
- **Auth Events**: ~1-2 hours
- **MFE Integration**: ~3-4 hours
- **Testing**: ~3-4 hours
- **Documentation**: ~2-3 hours

**Total**: ~28-36 hours (~1 week for 1 developer, or 3-4 days for 2 developers working in parallel)
