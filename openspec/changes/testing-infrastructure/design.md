# Design: Testing Infrastructure

## Context

Currently, the mf-mono project has zero test coverage. As the codebase grows and production deployment approaches, we need comprehensive testing to:
- Prevent regressions during rapid development
- Enable confident refactoring
- Document expected behavior
- Catch bugs before production

The micro-frontend architecture requires testing at multiple levels:
- **Packages** (`packages/auth`, `packages/events`) - Core business logic
- **Shell** (`apps/website`) - Auth, routing, layout, MFE integration
- **MFEs** (`apps/mfe-widget`) - Component behavior, API integration

We'll use Vitest (already included with Vite+) for unit and integration tests. E2E tests (Playwright) are deferred to a future change.

## Goals / Non-Goals

**Goals:**
- Establish Vitest configuration for all packages and apps
- Achieve >80% coverage for packages, >70% for apps
- Create reusable test utilities and patterns
- Enable fast local development (tests run in <30s)
- Support CI/CD integration
- Document testing conventions

**Non-Goals:**
- E2E testing with Playwright (separate change)
- Visual regression testing
- Load/performance testing
- Contract testing between frontend and backend

## Decisions

### 1. Test Framework: Vitest

**Decision**: Use Vitest for all unit and integration tests.

**Rationale**:
- Already included with Vite+ (zero additional setup)
- Compatible with Vite's build system
- Fast (native ESM, parallelization)
- Jest-compatible API (familiar for developers)
- TypeScript support out-of-the-box
- Watch mode with HMR-like speed

**Alternatives considered**:
- Jest - Slower, requires more configuration for ESM
- Testing Library standalone - Not a test runner

### 2. DOM Environment: happy-dom

**Decision**: Use happy-dom for React component tests.

**Rationale**:
- 2-10x faster than jsdom
- Sufficient for most React testing needs
- Actively maintained
- Smaller bundle size

**Alternatives considered**:
- jsdom - Slower but more complete DOM implementation
- No DOM (node environment) - Can't test React components

### 3. Component Testing: React Testing Library

**Decision**: Use @testing-library/react for component tests.

**Rationale**:
- Industry standard for React testing
- Encourages testing user behavior, not implementation
- Excellent TypeScript support
- Works seamlessly with Vitest

**Principles**:
- Query by role/label (accessibility-first)
- Avoid testing implementation details
- Test behavior, not structure

### 4. File Organization: Co-located Tests

**Decision**: Place test files next to source files with `.test.ts(x)` suffix.

**Example**:
```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── utils/
│   ├── formatDate.ts
│   └── formatDate.test.ts
```

**Rationale**:
- Easy to find related tests
- Clear ownership
- Encouraged by Vite+ and Vitest
- Scales well with feature-based organization

**Alternatives considered**:
- Separate `__tests__` directory - More traditional but harder to maintain
- Global `test/` directory - Doesn't scale for micro-frontends

### 5. Mocking Strategy

**Decision**: Use Vitest's built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`).

**Patterns**:
- **window.__AUTH__** - Mock directly in test setup
- **fetch API** - Mock with `vi.stubGlobal('fetch', mockFetch)`
- **Event bus** - Mock emitMFEEvent and onMFEEvent
- **React Router** - Use MemoryRouter for isolated tests

**Avoid**:
- Over-mocking (prefer integration when possible)
- Mocking implementation details (mock interfaces, not internals)

### 6. Coverage Thresholds

**Decision**: Enforce coverage thresholds per package/app.

**Thresholds**:
```typescript
// packages/ (shared code - high threshold)
coverage: {
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80
}

// apps/ (UI code - moderate threshold)
coverage: {
  statements: 70,
  branches: 65,
  functions: 70,
  lines: 70
}
```

**Rationale**:
- Shared packages are critical (higher bar)
- UI code has more edge cases (lower bar)
- Thresholds prevent coverage decay

### 7. Test Utilities Location

**Decision**: Create test utilities at app/package level, not global.

**Structure**:
```
apps/website/
└── src/
    └── test/
        ├── utils.tsx          # renderWithAuth, renderWithRouter
        ├── mocks.ts           # mockUser, mockApiResponse
        └── setup.ts           # Global test setup

packages/auth/
└── src/
    └── test/
        └── utils.ts           # createMockToken, mockTokenManager
```

**Rationale**:
- Each app/package has different testing needs
- Avoids "god object" test utility file
- Easier to find relevant helpers

**Global utilities (if needed)**:
- Extract to `packages/test-utils` after patterns stabilize

### 8. Async Testing Pattern

**Decision**: Use `async/await` with `waitFor` for async tests.

**Pattern**:
```typescript
test('async operation', async () => {
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

**Avoid**:
- `flush()` or `tick()` (implementation-specific)
- Hardcoded delays (`setTimeout` in tests)

### 9. CI Integration

**Decision**: Run tests in CI with coverage enforcement.

**CI Configuration**:
```yaml
- name: Run tests
  run: pnpm test:run --coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

**Rationale**:
- Tests must pass before merge
- Coverage trends are visible
- Prevents regressions

## Technical Architecture

### Test Execution Flow

```
pnpm test (root)
  ↓
Turborepo runs tests in parallel
  ↓
Each package/app runs Vitest
  ↓
Vitest loads vitest.config.ts
  ↓
Runs setupFiles (global mocks, test utilities)
  ↓
Executes .test.ts(x) files
  ↓
Generates coverage report
  ↓
Enforces thresholds (exit code 1 if failed)
```

### Package Structure

```
packages/auth/
├── src/
│   ├── TokenManager.ts
│   ├── TokenManager.test.ts     ← Unit tests
│   ├── types.ts
│   └── test/
│       └── utils.ts             ← Test utilities
├── vitest.config.ts             ← Vitest config
└── package.json                 ← Test scripts
```

### App Structure

```
apps/website/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   └── ProtectedRoute.test.tsx    ← Unit tests
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── AuthProvider.test.tsx      ← Integration tests
│   └── test/
│       ├── utils.tsx                   ← Test utilities
│       ├── mocks.ts                    ← Mock data
│       └── setup.ts                    ← Global setup
├── vitest.config.ts
└── package.json
```

### Vitest Configuration

**Shared config** (`vitest.config.base.ts` - if needed):
```typescript
export default {
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/dist/**',
        '**/coverage/**'
      ]
    }
  }
};
```

**Package-specific** (`packages/auth/vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // No DOM needed
    coverage: {
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    }
  }
});
```

**App-specific** (`apps/website/vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src' // Match tsconfig paths
    }
  }
});
```

## Test Patterns

### Unit Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { tokenManager } from './TokenManager';

describe('TokenManager', () => {
  it('should store and retrieve token', () => {
    tokenManager.setAccessToken('token123', 900);
    expect(tokenManager.getAccessToken()).toBe('token123');
  });

  it('should schedule refresh at 80% lifetime', () => {
    // Use vi.useFakeTimers() for timer testing
  });
});
```

### Component Test Pattern

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  it('should redirect when not authenticated', () => {
    // Mock useAuth hook
    vi.mock('../providers/AuthProvider', () => ({
      useAuth: () => ({ isAuthenticated: false, isLoading: false })
    }));

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Integration Test Pattern

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

describe('AuthProvider Integration', () => {
  it('should login and update state', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'token', user: { email: 'test@example.com' } })
      })
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider
    });

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ email: 'test@example.com' });
  });
});
```

## Risks / Trade-offs

### Risk 1: Test Maintenance Overhead
**Risk**: Tests become brittle and require frequent updates.

**Mitigation**:
- Use React Testing Library (test behavior, not implementation)
- Avoid over-specific assertions (test contract, not details)
- Extract common test utilities to reduce duplication

### Risk 2: Slow Test Suite
**Risk**: Test suite becomes too slow for rapid iteration.

**Mitigation**:
- Use happy-dom (faster than jsdom)
- Run tests in parallel (Vitest default)
- Mock expensive operations (API calls, timers)
- Monitor and optimize slow tests

**Target**: <30s for full unit/integration suite

### Risk 3: Coverage Without Quality
**Risk**: High coverage but poor test quality (trivial tests).

**Mitigation**:
- Code review focuses on test quality
- Test scenarios from specs (not just happy path)
- Prefer integration tests over isolated unit tests

### Risk 4: Flaky Tests
**Risk**: Tests pass/fail intermittently.

**Mitigation**:
- Avoid timing-dependent tests (use fake timers)
- Ensure proper cleanup (afterEach hooks)
- Use Vitest's retry mechanism for truly async operations

### Risk 5: Mock Maintenance
**Risk**: Mocks drift from real implementations.

**Mitigation**:
- Prefer integration tests (fewer mocks)
- Update mocks when interfaces change
- Validate mocks match real API contracts

## Dependencies

**Required Packages**:
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitest/ui": "^2.0.0",
    "happy-dom": "^15.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Note**: Vitest is already included with Vite+, but specific versions may need to be pinned.

## Future Enhancements

1. **Visual Regression Testing** - Chromatic or Percy (deferred)
2. **Contract Testing** - Pact for API contracts (deferred)
3. **Mutation Testing** - Stryker to validate test quality (deferred)
4. **Shared Test Utils Package** - Extract common patterns to `packages/test-utils` (after patterns stabilize)
