# Core Framework Analysis - What to Port to MF Mono

**Analysis Date**: 2026-07-09  
**Core Framework**: `/Users/ali.raza/dev/core-framework`  
**MF Mono**: `/Users/ali.raza/dev/mf-mono`

---

## 🎯 TL;DR - One Thing Worth Porting

**Only 1 shell-level feature to port**: **401 Auto-Retry in Axios** (2 hours)

Everything else is either:
- ✅ Already covered by Vite+ (linting, formatting)
- ✅ Already planned (testing, runtime config)
- ⏸️ MFE-level concerns (hooks, state management)
- ❌ Incompatible (TanStack Router)

---

## 🔍 Analysis Summary

### What Core Framework Uses:
- **React 19.1** ≈ Our React 19.0 ✅
- **TypeScript 5.8** < Our TypeScript 6.0.2 ✅
- **Vite 7.1** (raw) vs Our Vite+ (wrapper with extras) ✅
- **TanStack Router** vs Our React Router 8 ❌ Incompatible
- **Biome** vs Vite+ built-in linter ✅ We're covered
- **Axios** - They have retry, we don't ⚠️ Should add

---

## ✅ What Vite+ Already Gives Us

```bash
vp check        # Format + lint + type check (all-in-one)
vp lint         # Lint code (like Biome)
vp format       # Format code (like Biome)
vp test         # Run tests (Vitest)
vp build        # Production build
vp pack         # Library build
```

**We DON'T need**:
- ❌ Biome (Vite+ has linting/formatting)
- ❌ Separate ESLint/Prettier (Vite+ handles it)
- ❌ Custom build scripts (Vite+ handles it)

---

## 🎯 THE ONE Thing to Port: 401 Auto-Retry

### What Core Framework Has (That We Need)

**File**: `core-framework/src/api/client.ts` (lines 66-90)

```typescript
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Refresh token
      const newToken = await this.getRefreshTokenPromise();
      
      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return this.axiosInstance(originalRequest);
    }
    
    throw error;
  }
);
```

### Why This Matters

**Current Behavior (Without Retry):**
1. User makes API call
2. Token expires (15 min)
3. API returns 401
4. Request fails ❌
5. User sees error
6. TokenManager refreshes in background
7. User has to retry manually

**With Auto-Retry:**
1. User makes API call
2. Token expires (15 min)
3. API returns 401
4. Interceptor catches it
5. Wait for token refresh
6. Retry same request ✅
7. User gets data (never saw error!)

### How to Implement in Our MFEs

**File**: `apps/mfe-widget/src/utils/apiClient.ts`

Add this to response interceptor:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Wait a bit for shell to refresh token (it happens automatically)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get fresh token from shell
      const token = (window as any).__AUTH__?.getAccessToken();
      
      if (token) {
        // Retry with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);
```

**Benefits:**
- ✅ Users never see 401 errors (seamless recovery)
- ✅ No manual retry needed
- ✅ Works with our auto-refresh system
- ✅ Better UX

**Effort**: 2 hours (add to each MFE's apiClient.ts)

---

## ⏸️ MFE-Level Features (Let MFEs Decide)

These are **application-level concerns**, not shell concerns:

### 1. useDebounce Hook
```typescript
const debouncedSearch = useDebounce(searchTerm, 500);
```

**Decision**: Let each MFE add if needed  
**Reason**: Shell doesn't need debouncing, MFEs do  
**Copy from**: `core-framework/src/hooks/useDebounce.ts`

---

### 2. useDelayedLoading Hook
```typescript
const showSpinner = useDelayedLoading(isLoading, 1000);
```

**Decision**: Let each MFE add if needed  
**Reason**: MFE-level UI concern  
**Copy from**: `core-framework/src/hooks/useDelayedLoading.ts`

---

### 3. TanStack Query
```typescript
const { data } = useQuery({ queryKey: ['users'], queryFn: getUsers });
```

**Decision**: Let each MFE decide  
**Reason**: Data fetching strategy is per-MFE  
**Note**: Good for MFEs with complex data needs

---

### 4. Zustand (State Management)
```typescript
const useStore = create((set) => ({ count: 0, inc: () => set(s => ({ count: s.count + 1 })) }));
```

**Decision**: Let each MFE decide  
**Reason**: Each MFE manages its own state  
**Note**: We use React Context in shell (sufficient)

---

### 5. Tailwind CSS
**Decision**: Let each MFE decide  
**Reason**: Styling is per-MFE  
**Note**: Shell uses inline styles (fine for MVP)

---

### 6. i18n (React Intl)
**Decision**: Shell-level, but DEFER  
**Reason**: Add when internationalization is required  
**Effort**: 8-12 hours when needed

---

## ✅ Already Planned in ROADMAP

These are already in `ROADMAP.md`:

### 1. Runtime Configuration
**Core framework has**: `window.__RUNTIME_CONFIG__`  
**We have**: OpenSpec change `environment-configuration` (80 tasks, 16-20h)  
**Status**: Planned for Week 2-3  
**Decision**: ✅ Implement as planned (can use their pattern as reference)

---

### 2. Testing Infrastructure
**Core framework has**: Vitest + Playwright + Coverage  
**We have**: Planned in ROADMAP (15-20h)  
**Status**: Priority 3 (Week 4)  
**Decision**: ✅ Copy their setup (it's proven)

**Scripts to copy:**
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

---

## ❌ What NOT to Port

### 1. TanStack Router
**Why not**: We use React Router 8 (already implemented hybrid routing)  
**Effort to migrate**: 2-3 days  
**Decision**: ❌ Skip - not worth it

---

### 2. Biome Linter/Formatter
**Why not**: Vite+ has `vp lint` and `vp format` built-in  
**Decision**: ❌ Skip - we're covered

---

### 3. Their Auth System
**Why not**: Ours is better (Keycloak + HttpOnly cookies vs server token)  
**Decision**: ❌ Skip - keep ours

---

## 📊 Comparison: Shell Level Only

| Feature | Core Framework | MF Mono | Action |
|---------|---------------|---------|--------|
| **Linting** | Biome | Vite+ built-in | ✅ Already have |
| **Formatting** | Biome | Vite+ built-in | ✅ Already have |
| **Type Checking** | tsc | Vite+ built-in | ✅ Already have |
| **Auth System** | Server token | Keycloak + HttpOnly | ✅ Ours is better |
| **401 Auto-Retry** | ✅ | ❌ | ⚠️ **ADD THIS** |
| **Runtime Config** | ✅ | Planned (Week 2-3) | ✅ Already planned |
| **Testing** | Vitest + Playwright | Planned (Week 4) | ✅ Already planned |
| **Token Deduplication** | ✅ | ✅ | ✅ Already have |
| **Router** | TanStack | React Router 8 | ✅ Keep ours |

---

## 📊 Comparison: MFE Level (Let MFEs Decide)

| Feature | Core Framework | MF Mono | Decision |
|---------|---------------|---------|----------|
| **useDebounce** | ✅ | ❌ | ⏸️ MFE choice |
| **useDelayedLoading** | ✅ | ❌ | ⏸️ MFE choice |
| **TanStack Query** | ✅ | ❌ | ⏸️ MFE choice |
| **Zustand** | ✅ | React Context | ⏸️ MFE choice |
| **Tailwind** | ✅ | Inline styles | ⏸️ MFE choice |
| **i18n** | ✅ | ❌ | ⏸️ When needed |

---

## 🎬 Recommended Action

### Immediate (2 hours):
✅ **Add 401 auto-retry to MFE Axios interceptors**

**Files to update:**
1. `apps/mfe-widget/src/utils/apiClient.ts`
2. Any future MFE's `apiClient.ts`

**Code to add** (see "How to Implement" section above)

---

### Short-term (Already Planned):
1. ✅ Runtime configuration (Week 2-3, 16-20h) - Use core-framework pattern
2. ✅ Testing infrastructure (Week 4, 15-20h) - Copy their Vitest + Playwright setup

---

### MFE-Specific (Optional):
⏸️ MFE teams can copy these from core-framework as needed:
- `useDebounce` hook
- `useDelayedLoading` hook
- TanStack Query setup
- Zustand store pattern
- Tailwind config

---

## 📁 Files to Reference

If MFE teams want to copy features:

```
core-framework/
├── src/api/client.ts              # 401 retry logic (lines 66-90)
├── src/config/env.ts              # Runtime config pattern
├── src/hooks/useDebounce.ts       # Debounce hook
├── src/hooks/useDelayedLoading.ts # Delayed loading hook
├── vitest.config.ts               # Vitest setup
├── playwright.config.ts           # Playwright setup
└── package.json                   # Test scripts
```

---

## ✅ Summary

**You're right!** Most of core-framework is MFE-level, not shell-level.

### What to do:

1. ✅ **Add 401 auto-retry** (2 hours) - The ONE shell-level improvement
2. ✅ **Keep using Vite+** - It already covers linting/formatting
3. ✅ **Stick to ROADMAP** - Testing and config already planned
4. ⏸️ **Let MFEs decide** - Hooks, state, styling are MFE concerns
5. ❌ **Don't port** - TanStack Router, Biome, their auth

### Time saved by this analysis:
- ❌ Don't add Biome (Vite+ has it) - Saved 2-3 hours
- ❌ Don't migrate to TanStack Router - Saved 2-3 days
- ❌ Don't copy MFE hooks to shell - Saved 4-6 hours

### Time to invest:
- ✅ Add 401 auto-retry - 2 hours (high value!)

**Net result**: You're on the right track! Just add the retry logic and you're good. 🎯
