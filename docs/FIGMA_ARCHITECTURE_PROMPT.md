Create a simple flow diagram 1920x1080 for management presentation. Title: "Modular Application Strategy - Build Faster, Deploy Independently"

**LEFT COLUMN - PROBLEM**:
Box 1: "Traditional Single App" - One monolithic website, slow to update, one bug breaks everything, big wait time to deploy, entire team blocked during updates.
Arrow down: "Releases take weeks"

**CENTER COLUMN - SOLUTION**:
Box 2: "Modular Approach" - Main Website (hub) + Mini Apps (independent modules)

- Website handles: Login, Navigation, Design
- Each Mini App: Independent team, works separately, deploys alone
  Arrow right showing: "Teams work in parallel"

**RIGHT COLUMN - BENEFITS**:
Box 3: "Business Impact"

- Deploy features in days not weeks
- Update one feature without breaking others
- Teams ship independently
- Faster bug fixes
- Better team productivity

**BOTTOM FLOW (User Journey)**:

1. User logs in once → All apps recognize them
2. User clicks feature → App loads instantly (no page refresh)
3. User gets seamless experience → Single dashboard, multiple apps behind it
4. Teams push updates → Users get new features without restarting

**KEY METRICS BOX**:
✓ 117 tests = High quality
✓ Zero outages from updates
✓ Each team moves fast
✓ Proven secure architecture

**COMPARISON TABLE** (Bottom):
Traditional vs Modular:

- Deploy time: Weeks vs Days ✓
- Update safety: Risky vs Safe ✓
- Team speed: Blocked vs Parallel ✓
- Bug impact: Entire system vs One module ✓
- User experience: Slow vs Instant ✓

Icons: Green checkmarks for benefits, red X for traditional problems, clock for faster deployment, team icon for parallel work, rocket for speed.

Export SVG and PNG 2x for presentations and board meetings.

---

# Technical Version (for developers)

Create micro-frontend architecture diagram 1920x1080. Blue #3B82F6 Shell, purple #8B5CF6 MFEs, green #10B981 packages, orange #F59E0B backend. TOP: Monorepo with apps/website, apps/mfe-widget and packages/auth, events, dynamic-loader. MIDDLE LEFT Shell: AuthProvider > App.tsx exposes window.**AUTH** > ProtectedRoute > Layout > MFE Loader. Arrow to MFE "Global auth" and TokenManager "login/logout". MIDDLE RIGHT MFE: App.tsx > setupAuthListeners > apiClient with request interceptor "Injects Bearer token" and response interceptor "401 wait 200ms retry". Listeners AUTH_LOGIN, AUTH_LOGOUT, AUTH_REFRESH. BOTTOM LEFT Packages: TokenManager box showing Singleton, Memory tokens, Auto-refresh at 80% (12min/15min), Methods login logout getAccessToken refreshToken. EventBus box showing Native EventTarget, Zero deps, Events auth:login, logout, refresh, navigation:request. BOTTOM CENTER Auth Flow vertical: Login > AuthProvider > POST /api/auth/login > Backend > returns accessToken user plus HttpOnly cookie > TokenManager stores in memory > window.**AUTH** global > EventBus.emit > MFEs update > Refresh scheduled at 80%. BOTTOM RIGHT API Flow: Call > Add token > Backend validates > If 401 wait 200ms get new token retry > Success. CENTER Event Hub spoke diagram: EventBus center with arrows to Shell emits, MFE Widget listens, MFE Other listens. Module Federation: Fetch remotes.config.json > Dynamic load > React.lazy import mfe-widget/App > Suspense render. Testing box: 117 tests, auth 22 100%, events 31 94%, shell 26, mfe-widget 30. Security callouts: Access memory XSS safe, Refresh HttpOnly cookie CSRF safe. Metrics: 8.39KB EventBus, 6.59KB TokenManager, Zero deps. Legend top-right: Blue solid arrow data flow, Red dashed events, Green dotted HTTP, Purple packages, Orange backend. Export SVG and PNG 2x.

---

# Full Documentation (expanded version)

## Overview

Create a comprehensive architecture diagram showing the complete flow of a production-ready micro-frontend (MFE) system with authentication, event-driven communication, and runtime configuration. Use modern, clean design with clear visual hierarchy.

## Design Style

- **Theme**: Modern tech diagram (light background, primary blue/purple gradient accents)
- **Typography**: Inter or SF Pro for labels, monospace for code snippets
- **Colors**:
  - Shell/Host: Blue (#3B82F6)
  - MFEs: Purple (#8B5CF6)
  - Packages: Green (#10B981)
  - Backend: Orange (#F59E0B)
  - Data Flow: Gray (#6B7280) with directional arrows
  - Events: Red (#EF4444) with dashed lines

## Main Components to Illustrate

### 1. **Architecture Overview (Top Section)**

```
┌─────────────────────────────────────────────────────────────┐
│  MONOREPO STRUCTURE (Turborepo)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  apps/                  packages/                            │
│  ├─ website (Shell)     ├─ @mf-mono/auth                    │
│  ├─ mfe-widget         ├─ @mf-mono/events                   │
│  └─ mfe-*              ├─ @mf-mono/dynamic-loader           │
│                         └─ @mf-mono/remote-config           │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Shell Application (Center Left)**

Draw a container representing `apps/website/` with:

**Components Inside:**

- **AuthProvider** (wraps entire app)
  - Label: "Manages auth state, initializes TokenManager"
- **App.tsx**
  - Label: "Exposes window.**AUTH** globally"
  - Code snippet: `window.__AUTH__ = { getAccessToken, isAuthenticated, user }`
- **ProtectedRoute**
  - Label: "Guards routes, redirects to /login"
- **Layout Component**
  - Shows: Header with user info, logout button
- **Dynamic MFE Loader**
  - Label: "Loads MFEs at runtime via Module Federation"

**Outputs:**

- Arrow to MFEs labeled: "Provides global auth context"
- Arrow to TokenManager: "Calls login(), logout(), initialize()"

### 3. **Micro-Frontend (MFE) - Right Side**

Draw a container representing `apps/mfe-widget/` with:

**Components Inside:**

- **App.tsx (MFE Root)**
  - Label: "Calls setupAuthListeners() on mount"
  - Shows router configuration (BrowserRouter/MemoryRouter)
- **apiClient.ts (Axios Instance)**
  - **Request Interceptor**: Box showing "Injects token from window.**AUTH**"
  - **Response Interceptor**: Box showing "Handles 401, waits 200ms, retries"
- **Event Listeners**
  - Label: "Listens for AUTH_LOGIN, AUTH_LOGOUT, AUTH_REFRESH"

**Inputs:**

- Arrow from Shell: "window.**AUTH** access"
- Dashed arrows from EventBus: "Auth events"

**Outputs:**

- Arrow to Backend API: "HTTP requests with Bearer token"

### 4. **Shared Packages (Bottom Section)**

#### **@mf-mono/auth Package**

```
┌─────────────────────────────────────┐
│  TokenManager (Singleton)           │
├─────────────────────────────────────┤
│  • stores access token (memory)     │
│  • auto-refresh at 80% lifetime     │
│  • deduplicates refresh requests    │
│  • emits events on state changes    │
│                                      │
│  Methods:                            │
│  ├─ login(email, password)          │
│  ├─ logout()                         │
│  ├─ refreshToken()                   │
│  ├─ getAccessToken()                 │
│  └─ isAuthenticated()                │
└─────────────────────────────────────┘
```

#### **@mf-mono/events Package**

```
┌─────────────────────────────────────┐
│  EventBus (Native EventTarget)      │
├─────────────────────────────────────┤
│  • Zero dependencies                 │
│  • Type-safe helpers                 │
│  • Built-in cleanup                  │
│                                      │
│  Events:                             │
│  ├─ mfe:auth:login                  │
│  ├─ mfe:auth:logout                 │
│  ├─ mfe:auth:refresh                │
│  ├─ mfe:navigation:request          │
│  └─ mfe:config:loaded               │
└─────────────────────────────────────┘
```

### 5. **Complete Authentication Flow (Main Flow Diagram)**

**Visual Flow (Left to Right, Top to Bottom):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   [User clicks Login button]
         ↓

2. SHELL - Login Component
   [Form submission] → calls AuthProvider.login(email, password)
         ↓

3. AUTH PACKAGE - TokenManager
   [TokenManager.login()]
         ↓
   POST /api/auth/login {email, password}
         ↓

4. BACKEND (Keycloak)
   [Validates credentials]
         ↓
   Response: {accessToken, user, expiresIn}
   Sets: HttpOnly cookie (refreshToken)
         ↓

5. TOKEN STORAGE
   [Memory] accessToken stored in TokenManager
   [Cookie] refreshToken stored (HttpOnly, Secure)
         ↓

6. GLOBAL STATE
   window.__AUTH__ = {
     getAccessToken: () => token,
     isAuthenticated: true,
     user: {...}
   }
         ↓

7. EVENT BROADCAST
   EventBus.emit('mfe:auth:login', {user})
         ↓

8. MFEs RESPOND
   [All MFEs] receive event → update local state
         ↓

9. AUTO-REFRESH SCHEDULED
   TokenManager schedules refresh at 80% lifetime (12 min)
```

### 6. **API Request Flow with Token**

**Visual Flow:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     API REQUEST FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

1. MFE ACTION
   [Component makes API call]
   Example: apiClient.get('/api/widgets')
         ↓

2. REQUEST INTERCEPTOR
   const token = window.__AUTH__?.getAccessToken()
   config.headers.Authorization = `Bearer ${token}`
         ↓

3. HTTP REQUEST
   GET /api/widgets
   Headers: Authorization: Bearer eyJhbGc...
         ↓

4. BACKEND
   [Validates JWT token]
         ↓
         ├─ Valid → [200 OK] → Response data
         │                          ↓
         │                    [MFE receives data]
         │
         └─ Invalid/Expired → [401 Unauthorized]
                                      ↓

5. RESPONSE INTERCEPTOR (401 Handler)
   if (status === 401 && !request._retry) {
     request._retry = true

     // Wait for shell to refresh token (200ms)
     await new Promise(resolve => setTimeout(resolve, 200))

     // Get new token
     const newToken = window.__AUTH__?.getAccessToken()

     // Retry request with new token
     request.headers.Authorization = `Bearer ${newToken}`
     return apiClient(request)  ✅ SUCCESS
   }
```

### 7. **Auto-Refresh Flow (Background Process)**

**Timeline Visualization:**

```
Token Lifetime: 15 minutes (900 seconds)
─────────────────────────────────────────────────────────────
0s        360s       720s       900s
│         │          │          │
Login     │     Refresh @80%  Token Expires
│         │          │          │
│<────────────────>│             │
│  Normal Usage    │             │
│                  │             │
│                  ↓             │
│         [Auto-Refresh Triggered]
│                  │             │
│                  ↓             │
│         POST /api/auth/refresh │
│         Cookies: refreshToken  │
│                  │             │
│                  ↓             │
│         New Token Received     │
│         [Stored in memory]     │
│                  │             │
│                  ↓             │
│         EventBus.emit('mfe:auth:refresh')
│                  │             │
│                  ↓             │
│         [All MFEs notified]    │
│                  │             │
│<────────────────────────────>  │
│     Continue Usage (Seamless)  │
```

### 8. **Event Communication Diagram**

**Hub and Spoke Model:**

```
                    ┌──────────────┐
                    │  EventBus    │
                    │  (Central)   │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼─────┐
   │  Shell  │       │ MFE Widget│     │ MFE Other │
   │(Emits)  │       │(Listens)  │     │(Listens)  │
   └─────────┘       └───────────┘     └───────────┘

Events:
• mfe:auth:login → Broadcast to all MFEs
• mfe:auth:logout → Broadcast to all MFEs
• mfe:auth:refresh → Broadcast to all MFEs
• mfe:navigation:request → Shell handles routing
```

### 9. **Module Federation Runtime Loading**

**Visual:**

```
┌─────────────────────────────────────────────────────────────┐
│  Shell Startup                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Fetch remotes.config.json                               │
│     {                                                        │
│       "remotes": [                                           │
│         {                                                    │
│           "name": "mfe-widget",                             │
│           "url": "http://localhost:5174/remoteEntry.js"    │
│         }                                                    │
│       ]                                                      │
│     }                                                        │
│                                                              │
│  2. Dynamic Loader loads remote                             │
│     ↓                                                        │
│  3. React.lazy(() => import('mfe-widget/App'))             │
│     ↓                                                        │
│  4. MFE renders in <Suspense> boundary                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10. **Testing Architecture (Bottom Section)**

```
┌─────────────────────────────────────────────────────────────┐
│  TESTING INFRASTRUCTURE (117 tests passing)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Packages:                                                   │
│  • @mf-mono/auth: 22 tests (100% coverage)                 │
│  • @mf-mono/events: 31 tests (94.44% coverage)             │
│  • @mf-mono/dynamic-loader: 9 tests                         │
│                                                              │
│  Apps:                                                       │
│  • website (shell): 26 tests (25 pass, 1 skip)             │
│  • mfe-widget: 30 tests (100% pass)                         │
│                                                              │
│  Tools: Vitest, Testing Library, happy-dom                  │
└─────────────────────────────────────────────────────────────┘
```

## Visual Annotations to Include

1. **Legend Box** (top right corner):
   - Blue solid arrow: Data/props flow
   - Red dashed arrow: Event emission
   - Green dotted arrow: HTTP requests
   - Purple: Shared packages
   - Orange: External systems (Backend/Keycloak)

2. **Key Metrics Badges** (bottom):
   - "117 Tests Passing"
   - "Zero Dependencies (events, auth)"
   - "8.39 KB (EventBus)"
   - "6.59 KB (TokenManager)"
   - "Auto-refresh @ 80% lifetime"

3. **Security Notes** (call-out boxes):
   - "Access tokens: In-memory only (XSS safe)"
   - "Refresh tokens: HttpOnly cookies (CSRF safe)"
   - "No tokens in localStorage"

4. **Performance Notes**:
   - "Proactive refresh prevents 401 errors"
   - "Refresh deduplication (multiple MFEs)"
   - "Native EventTarget (zero dependencies)"

## Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│  Title: Micro-Frontend Architecture with Auth & Events         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Monorepo Structure]                        [Legend]          │
│                                                                 │
│  ┌─────────────┐              ┌─────────────┐                 │
│  │   Shell     │─────────────→│     MFE     │                 │
│  │  (Website)  │              │  (Widget)   │                 │
│  │             │←─────────────│             │                 │
│  └─────────────┘              └─────────────┘                 │
│         │                              │                       │
│         ↓                              ↓                       │
│  ┌──────────────────────────────────────────┐                 │
│  │     Shared Packages                       │                 │
│  │  [TokenManager] [EventBus] [Loader]      │                 │
│  └──────────────────────────────────────────┘                 │
│                     │                                          │
│                     ↓                                          │
│              [Backend/Keycloak]                                │
│                                                                 │
│  [Authentication Flow] → [API Request Flow] → [Auto-Refresh]  │
│                                                                 │
│  [Testing Infrastructure]                  [Key Metrics]       │
└────────────────────────────────────────────────────────────────┘
```

## Additional Elements

- **Add call-out boxes** for critical decision points:
  - "Why memory-only tokens?"
  - "Why 80% refresh threshold?"
  - "Why 200ms retry delay?"

- **Include code snippets** in monospace font for:
  - window.**AUTH** object structure
  - Event emission syntax
  - Axios interceptor logic

- **Timeline visualization** for token lifecycle

- **Sequence diagram** for 401 retry flow

## Technical Details to Emphasize

### Token Management

```typescript
// Access Token (Memory)
TokenManager.accessToken = "eyJhbGc..."
// Lifetime: 15 minutes
// Auto-refresh: 12 minutes (80%)

// Refresh Token (HttpOnly Cookie)
Set-Cookie: refreshToken=xyz; HttpOnly; Secure; SameSite=Strict
// Lifetime: 30 days
// Used only by backend
```

### Event Bus Pattern

```typescript
// Shell emits
eventBus.emit('mfe:auth:login', { user: {...} })

// MFE listens
eventBus.on('mfe:auth:login', (event) => {
  setUser(event.detail.user)
})
```

### Axios Integration

```typescript
// Request Interceptor
config.headers.Authorization = `Bearer ${window.__AUTH__.getAccessToken()}`;

// Response Interceptor (401)
if (error.response?.status === 401) {
  await sleep(200); // Wait for auto-refresh
  const newToken = window.__AUTH__.getAccessToken();
  return retry(originalRequest, newToken);
}
```

## Export Requirements

- **Format**: SVG (scalable), PNG @2x (for docs), Figma file (editable)
- **Canvas Size**: 1920x1080 (landscape) for presentations
- **Variants**: Light mode (primary), Dark mode (optional)
- **Accessibility**: High contrast ratios (WCAG AA compliant)

## Usage Instructions

1. **Copy the non-technical or technical prompt** (top of file) into Figma Make, Claude, ChatGPT, or Midjourney
2. **Request adjustments** for specific areas if needed
3. **Export** in multiple formats for different use cases:
   - SVG for web/docs (scalable)
   - PNG @2x for README/presentations
   - PDF for print/sharing

## Notes for AI Generation

- Prioritize **clarity over complexity** - each box should be readable
- Use **consistent spacing** - 24px between major sections
- Apply **visual hierarchy** - larger boxes for main components, smaller for details
- Include **interactive elements** notation (if using Figma):
  - Clickable boxes that expand to show code
  - Hover states for additional context
  - Collapsible sections for detailed flows

---

**Created**: 2026-07-09  
**Project**: MF Mono - Micro-Frontend Architecture  
**Version**: 2.0 (Non-Technical + Technical)  
**Author**: Development Team
