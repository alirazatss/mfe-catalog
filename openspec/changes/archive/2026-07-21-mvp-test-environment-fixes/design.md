# Test Environment Fixes - Design

## Design Summary

Fix 59 failing tests by: (1) configuring DOM environments in all vitest.config.ts, (2) replacing obsolete `window.__AUTH__` mocks with current `window.__MFE_AUTH__` bridge contract, (3) creating test utilities that correctly emit EventBus events during auth operations.

## Architecture

### DOM Environment Setup

**Approach**: Add `environment: 'happy-dom'` to all vitest.config.ts files (already installed as devDependency).

**Why happy-dom**: Lightweight, faster than jsdom, sufficient for component testing, no browser needed.

**Files affected**:

- 9 vitest.config.ts files (packages/auth, packages/auth-ui, packages/dynamic-loader, packages/events, packages/monorepo-tools, packages/remote-config, apps/website, apps/mfe-widget, root)

**Implementation**:

```javascript
export default defineConfig({
  test: {
    environment: "happy-dom", // ADD THIS LINE
    // ... rest of config
  },
});
```

### Auth Bridge Mocking

**Approach**: Create test utilities exporting:

- `createMockAuthBridge()` - factory returning object matching MFEAuthBridge contract
- `setupAuthBridge()` - test setup that assigns to `window.__MFE_AUTH__`
- `setMockToken(token)` - helper to control token state in tests
- Event wiring that emits to EventBus when bridge methods called

**Location**: Create `src/test/auth-bridge.ts` in each package/app that tests auth code.

**Bridge contract**:

```typescript
interface MFEAuthBridge {
  getAccessToken(): string | null;
  isAuthenticated(): boolean;
  login(credentials: { email: string; password: string }): Promise<void>;
  logout(): Promise<void>;
  onAuthChange(callback: (state: AuthState) => void): () => void;
}
```

**Event emissions**:

- `login()` → emit `mfe:auth:login` with `{ user, accessToken }`
- `logout()` → emit `mfe:auth:logout`
- Token change → emit `mfe:auth:refresh` with new token

### Shell Test Setup

**Approach**: Enhance `apps/website/src/shell/` tests to mock DynamicLoader lifecycle.

**Mock methods needed**:

- `setConfig(manifest)`
- `listChromeMFEs()`
- `matchRoute(pathname)` → returns ResolvedMFE or null
- `load(name, slotId, props)`
- `unload(name)`
- `update(name, props)`
- `getSlotOccupant(slotId)` → returns MFE name or null
- `clearSlot(slotId)`

**Location**: `apps/website/src/test/mock-loader.ts`

## Trade-offs

| Option                                    | Pros                          | Cons                     | Choice                                    |
| ----------------------------------------- | ----------------------------- | ------------------------ | ----------------------------------------- |
| happy-dom vs jsdom                        | Faster, lighter               | Less complete DOM        | happy-dom                                 |
| Test utils in each package vs shared      | Scope, clarity                | Duplication              | Shared `test/` folder per package         |
| Mock auth bridge vs real TokenManager     | Fast, controlled              | Diverges from production | Mock for unit tests, real for integration |
| EventBus wired in mock vs manual in tests | Automatic, matches production | More magic               | Wired in mock                             |

## Backward Compatibility

All changes are test-only. No production code modified. Existing tests without DOM setup will still work.

## Risk Mitigation

- **Risk**: Test utils not matching production contract
- **Mitigation**: Keep mock shape aligned with MFEAuthBridge interface, add type checks

- **Risk**: Tests still failing after fixes
- **Mitigation**: Incremental fixes; verify each change reduces failure count

## Success Metrics

- 59 failing tests → 0 failing tests (all 199 passing)
- `vp run test:run` exits with code 0
- No `window.__AUTH__` references remain in test files
