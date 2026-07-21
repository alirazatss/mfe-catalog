# Axios Integration with Auth Manager

## 📍 File Locations

### Shell (Website)

```
apps/website/src/
├── App.tsx                    # Exposes window.__AUTH__ globally
├── providers/AuthProvider.tsx # Manages auth state, calls tokenManager
└── main.tsx                   # Wraps app with AuthProvider
```

### MFE (Widget)

```
apps/mfe-widget/src/
├── App.tsx                    # Calls setupAuthListeners() on mount
└── utils/apiClient.ts         # Axios instance with interceptors
```

### Auth Package

```
packages/auth/src/
├── TokenManager.ts            # Singleton: stores token, auto-refresh
└── types.ts                   # User, LoginCredentials, etc.
```

---

## 🔄 Complete Integration Flow

### 1. Shell Initialization (apps/website/src/App.tsx)

```typescript
import { tokenManager } from "@mf-mono/auth";

export default function App() {
  // Expose auth methods globally for MFEs
  useEffect(() => {
    (window as any).__AUTH__ = {
      getAccessToken: () => tokenManager.getAccessToken(),
      isAuthenticated: () => tokenManager.isAuthenticated(),
    };
  }, []);
}
```

**What happens:**

- Shell creates a global `window.__AUTH__` object
- Exposes `getAccessToken()` function
- Exposes `isAuthenticated()` function
- MFEs can access these from any component/utility

---

### 2. MFE Axios Setup (apps/mfe-widget/src/utils/apiClient.ts)

#### Request Interceptor (Injects Token)

```typescript
apiClient.interceptors.request.use((config) => {
  // Get token from shell's global auth object
  const getAccessToken = (window as any).__AUTH__?.getAccessToken;

  if (getAccessToken) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});
```

**What happens:**

1. Every Axios request runs through this interceptor
2. Interceptor calls `window.__AUTH__.getAccessToken()`
3. TokenManager returns current in-memory token
4. Token injected as `Authorization: Bearer <token>` header
5. Request sent to backend with auth

---

#### Response Interceptor (Handles 401 Errors)

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[MFE] Unauthorized - Token may be expired");
      // Shell will handle auto-refresh or logout
      // MFE just logs the error
    }
    return Promise.reject(error);
  },
);
```

**What happens:**

1. If API returns 401 Unauthorized
2. MFE logs the error
3. Shell's TokenManager auto-refreshes the token (80% lifetime)
4. Next request will use new token automatically

---

### 3. MFE Usage (Example)

```typescript
// In any MFE component
import { apiClient } from '../utils/apiClient';

const MyComponent = () => {
  const fetchData = async () => {
    try {
      // Token automatically injected by interceptor
      const response = await apiClient.get('/users/me');
      console.log('User data:', response.data);
    } catch (error) {
      console.error('API error:', error);
    }
  };

  return <button onClick={fetchData}>Fetch Data</button>;
};
```

**Request sent:**

```http
GET /api/users/me HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 🔐 Token Lifecycle

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Login.tsx → AuthProvider.login()                               │
│  POST /api/auth/login { email, password }                       │
│                                                                  │
│  Backend Response:                                               │
│  {                                                               │
│    accessToken: "eyJ...",                                       │
│    user: { id, email, name },                                   │
│    expiresIn: 900  // 15 minutes                                │
│  }                                                               │
│  + HttpOnly cookie: refreshToken=xyz (7 days)                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TokenManager.setAccessToken(token, 900)                        │
│                                                                  │
│  - Stores in memory: this.accessToken = token                   │
│  - Calculates 80% lifetime: 900s * 0.8 = 720s (12 min)          │
│  - Schedules auto-refresh in 12 minutes                         │
│  - Emits AUTH_LOGIN event                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  window.__AUTH__ = {                                             │
│    getAccessToken: () => tokenManager.getAccessToken(),         │
│    isAuthenticated: () => tokenManager.isAuthenticated()        │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     USER MAKES API CALL                          │
│  (From any MFE)                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  apiClient.get('/data')                                          │
│                                                                  │
│  ↓ Request Interceptor Runs                                     │
│                                                                  │
│  const token = window.__AUTH__.getAccessToken();                │
│  → tokenManager.getAccessToken()                                │
│  → Returns: "eyJ..."                                             │
│                                                                  │
│  config.headers.Authorization = "Bearer eyJ..."                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Request sent to backend:                                        │
│  GET /api/data                                                   │
│  Authorization: Bearer eyJ...                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend validates token with Keycloak                           │
│  Returns 200 OK with data                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ⏰ 12 MINUTES LATER...
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TokenManager auto-refresh timer fires (80% lifetime)            │
│                                                                  │
│  POST /api/auth/refresh                                          │
│  (HttpOnly cookie automatically sent)                            │
│                                                                  │
│  Backend Response:                                               │
│  {                                                               │
│    accessToken: "eyJ...NEW",                                    │
│    expiresIn: 900                                                │
│  }                                                               │
│  + Optionally rotates refresh token                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TokenManager.setAccessToken(newToken, 900)                     │
│                                                                  │
│  - Updates memory: this.accessToken = newToken                  │
│  - Reschedules next refresh in 12 minutes                       │
│  - Emits AUTH_REFRESH event                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  MFE Event Listener (in apiClient.ts)                            │
│                                                                  │
│  onMFEEvent(AUTH_REFRESH, () => {                               │
│    console.log('[MFE] Token refreshed');                        │
│    // Next API call will use new token automatically            │
│  });                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                  ✅ USER CONTINUES WORKING
                  ✅ NO INTERRUPTION
                  ✅ AUTO-REFRESHES EVERY 12 MIN
```

---

## 🔍 Detailed Code Flow

### Step 1: Shell Exposes TokenManager

**File**: `apps/website/src/App.tsx`

```typescript
import { tokenManager } from "@mf-mono/auth";

export default function App() {
  useEffect(() => {
    // Create global __AUTH__ object
    (window as any).__AUTH__ = {
      getAccessToken: () => tokenManager.getAccessToken(),
      isAuthenticated: () => tokenManager.isAuthenticated(),
    };
  }, []);
}
```

**What's happening:**

- `tokenManager` is imported from `@mf-mono/auth` package
- It's a **singleton** (same instance across entire app)
- `window.__AUTH__` exposes two methods:
  - `getAccessToken()` → Returns current token from memory
  - `isAuthenticated()` → Returns boolean (true if token exists)

---

### Step 2: MFE Creates Axios Instance

**File**: `apps/mfe-widget/src/utils/apiClient.ts`

```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});
```

**What's happening:**

- Creates an Axios instance with default config
- All API calls use this instance: `apiClient.get('/users')`
- Base URL is `/api` (adjust based on your backend)

---

### Step 3: Request Interceptor Injects Token

**File**: `apps/mfe-widget/src/utils/apiClient.ts`

```typescript
apiClient.interceptors.request.use(
  (config) => {
    // 1. Get getAccessToken function from global object
    const getAccessToken = (window as any).__AUTH__?.getAccessToken;

    // 2. Check if function exists (shell might not be ready)
    if (getAccessToken) {
      // 3. Call the function to get current token
      const token = getAccessToken();

      // 4. If token exists, inject it
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 5. Return modified config
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
```

**What's happening:**

1. Every request goes through this interceptor
2. Interceptor calls `window.__AUTH__.getAccessToken()`
3. This calls `tokenManager.getAccessToken()` in the shell
4. TokenManager returns the in-memory token
5. Token added to request headers
6. Request proceeds with authentication

**Example Request:**

```http
GET /api/users/me HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

### Step 4: Response Interceptor Handles Errors

**File**: `apps/mfe-widget/src/utils/apiClient.ts`

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[MFE] Unauthorized - Token may be expired");
      // Shell's TokenManager will auto-refresh
      // Or emit logout event if refresh fails
    }
    return Promise.reject(error);
  },
);
```

**What's happening:**

1. If API returns 401 Unauthorized
2. MFE logs the error (for debugging)
3. Shell's TokenManager handles refresh automatically
4. If refresh succeeds: next request uses new token
5. If refresh fails: AUTH_LOGOUT event emitted, user redirected to login

---

### Step 5: TokenManager Auto-Refreshes

**File**: `packages/auth/src/TokenManager.ts`

```typescript
class TokenManager {
  private async performRefresh(): Promise<void> {
    try {
      // Call backend with HttpOnly cookie
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include", // Send HttpOnly cookie
      });

      const data = await response.json();

      // Update token in memory
      this.setAccessToken(data.accessToken, data.expiresIn);

      // Emit event for MFEs
      emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {
        newToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
    } catch (error) {
      // Refresh failed - emit logout event
      this.clear();
      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "refresh_failed",
      });
    }
  }
}
```

**What's happening:**

1. Timer fires at 80% token lifetime (e.g., 12 min for 15 min token)
2. POST to `/api/auth/refresh` (HttpOnly cookie sent automatically)
3. Backend validates refresh token from cookie
4. Backend returns new access token
5. TokenManager updates in-memory token
6. AUTH_REFRESH event emitted
7. All MFEs notified (but don't need to do anything)
8. Next API call automatically uses new token

---

## 💡 Why This Design?

### 1. Security

- **Access token in memory** → XSS attacks cannot steal it from localStorage
- **Refresh token in HttpOnly cookie** → JavaScript cannot access it at all
- **Short-lived access tokens** → Even if stolen, expires quickly (15 min)
- **Long-lived refresh tokens** → User doesn't have to login frequently (7 days)

### 2. Simplicity for MFEs

- **No auth logic in MFEs** → Just use `apiClient.get('/data')`
- **Token injection automatic** → Interceptor handles everything
- **No manual refresh** → Shell handles it transparently
- **Event-driven updates** → MFEs listen if they need to react

### 3. Centralized Control

- **Single source of truth** → TokenManager singleton in shell
- **Consistent behavior** → All MFEs use same auth flow
- **Easy to update** → Change auth logic in one place (shell)

---

## 🛠️ Alternative: Direct Import (Not Recommended)

**You COULD do this** (but we're not):

```typescript
// ❌ MFE directly importing tokenManager
import { tokenManager } from "@mf-mono/auth";

apiClient.interceptors.request.use((config) => {
  const token = tokenManager.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Why we DON'T do this:**

- **Violates architecture principle** → Shell owns auth, not MFEs
- **Harder to test** → MFEs now depend on shell's auth package
- **Less flexible** → Can't swap auth strategies easily
- **Bundle duplication** → Each MFE bundles auth package

**Why we DO use window.**AUTH**:**

- **Clear boundary** → Shell provides auth via global API
- **Loose coupling** → MFEs only depend on the interface
- **Runtime flexibility** → Can mock for testing
- **Single instance** → Only shell's tokenManager exists

---

## 📝 Quick Reference

### Shell Setup (One-time)

```typescript
// apps/website/src/App.tsx
import { tokenManager } from "@mf-mono/auth";

useEffect(() => {
  (window as any).__AUTH__ = {
    getAccessToken: () => tokenManager.getAccessToken(),
    isAuthenticated: () => tokenManager.isAuthenticated(),
  };
}, []);
```

### MFE Setup (Per MFE)

```typescript
// apps/mfe-*/src/utils/apiClient.ts
import axios from "axios";

export const apiClient = axios.create({ baseURL: "/api" });

apiClient.interceptors.request.use((config) => {
  const token = (window as any).__AUTH__?.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### MFE Usage (In Components)

```typescript
import { apiClient } from "../utils/apiClient";

const response = await apiClient.get("/users/me");
// Token automatically injected ✅
```

---

## 🔍 Troubleshooting

### Problem: "Authorization header missing"

**Cause**: `window.__AUTH__` not set  
**Fix**: Ensure shell App.tsx has the useEffect hook

### Problem: "Token is null"

**Cause**: User not logged in or token expired  
**Fix**: Check `tokenManager.isAuthenticated()`, redirect to login

### Problem: "401 Unauthorized loop"

**Cause**: Refresh endpoint failing  
**Fix**: Check backend `/api/auth/refresh` implementation

### Problem: "CORS error on refresh"

**Cause**: Backend not sending CORS headers for cookies  
**Fix**: Backend must set `Access-Control-Allow-Credentials: true`

---

## 🎯 Summary

**Token Flow:**

```
Login → TokenManager (memory) → window.__AUTH__ → Axios Interceptor → API Request
          ↓                                           ↑
    Auto-refresh (12 min)                      Gets fresh token
```

**Key Files:**

- `packages/auth/src/TokenManager.ts` - Stores token, handles refresh
- `apps/website/src/App.tsx` - Exposes `window.__AUTH__`
- `apps/mfe-widget/src/utils/apiClient.ts` - Axios with interceptors
- `apps/mfe-widget/src/App.tsx` - Calls `setupAuthListeners()`

**MFE Usage:**

```typescript
// Just use apiClient - token injected automatically!
const data = await apiClient.get("/endpoint");
```

🎉 **That's it! Axios setup complete with automatic auth!**
