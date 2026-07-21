# Testing Guide

This document describes the testing infrastructure and practices for the micro-frontend monorepo.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Coverage Requirements](#coverage-requirements)
- [Test Utilities](#test-utilities)
- [Best Practices](#best-practices)

## Overview

The project uses **Vitest** with **React Testing Library** for unit and integration testing. Tests are co-located with source files using the `.test.ts` or `.test.tsx` suffix.

### Test Distribution

- **Packages** (`packages/*`): Unit tests for shared libraries
- **Shell** (`apps/website`): Component and integration tests
- **MFEs** (`apps/mfe-*`): Component, utility, and integration tests
- **E2E**: Separate test suite (not covered in this document)

## Test Stack

| Tool                        | Purpose                     | Version |
| --------------------------- | --------------------------- | ------- |
| Vitest                      | Test runner                 | 3.2.7   |
| @testing-library/react      | Component testing           | 16.3.2  |
| @testing-library/user-event | User interaction simulation | 14.6.1  |
| @testing-library/jest-dom   | DOM matchers                | 6.6.4   |
| happy-dom                   | Fast DOM implementation     | 15.11.7 |
| @vitest/coverage-v8         | Code coverage               | 3.2.7   |

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm test:watch
```

### Run tests with coverage

```bash
pnpm test:coverage
```

### Run tests with UI

```bash
pnpm test:ui
```

### Run tests for a specific package

```bash
# Run tests for auth package
cd packages/auth && pnpm test

# Run tests for shell
cd apps/website && pnpm test:run

# Run tests for MFE
cd apps/mfe-widget && pnpm test:run
```

## Writing Tests

### File Organization

Tests are co-located with the source code:

```
src/
├── components/
│   ├── Layout.tsx
│   └── Layout.test.tsx          # Component test
├── utils/
│   ├── navigation.ts
│   └── navigation.test.ts       # Utility test
└── test/
    ├── setup.ts                 # Test setup
    ├── utils.tsx                # Test utilities
    └── mocks.ts                 # Mock data
```

### Basic Component Test

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./MyComponent.js";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent title="Hello" />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Testing with Router

**Shell (BrowserRouter)**:

```tsx
import { renderWithRouter } from "../test/utils.js";

it("should navigate correctly", () => {
  renderWithRouter(<MyComponent />);
  // ... assertions
});
```

**MFE (MemoryRouter)**:

```tsx
import { renderWithRouter } from "../test/utils.js";

it("should render with initial route", () => {
  renderWithRouter(<MyComponent />, {
    initialEntries: ["/dashboard"],
  });
  // ... assertions
});
```

### Testing with Auth

```tsx
import { renderWithAuth } from "../test/utils.js";
import { mockUser } from "../test/mocks.js";

it("should show user info when authenticated", () => {
  // Renders with AuthProvider + Router
  renderWithAuth(<MyComponent />);
  // ... assertions
});
```

### Mocking window.**AUTH**

```tsx
import { mockAuthGlobal, clearAuthGlobal } from "../test/mocks.js";

beforeEach(() => {
  mockAuthGlobal({
    isAuthenticated: true,
    user: mockUser,
    getAccessToken: () => "mock-token",
  });
});

afterEach(() => {
  clearAuthGlobal();
});
```

### Testing Async Code

```tsx
import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("should handle async operations", async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByText("Submit"));

  await waitFor(() => {
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
});
```

### Testing Event Bus

```tsx
import { eventBus, MFE_EVENTS } from "@mf-mono/events";

it("should emit event on action", () => {
  const handler = vi.fn();
  const cleanup = eventBus.on(MFE_EVENTS.NAVIGATE, handler);

  // Trigger action that emits event
  myFunction();

  expect(handler).toHaveBeenCalledWith({
    path: "/dashboard",
  });

  cleanup();
});
```

## Coverage Requirements

### Packages

Packages must maintain **80% coverage**:

```json
{
  "coverage": {
    "thresholds": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

### Apps (Shell & MFEs)

Apps must maintain **70% coverage**:

```json
{
  "coverage": {
    "thresholds": {
      "statements": 70,
      "branches": 65,
      "functions": 70,
      "lines": 70
    }
  }
}
```

### Excluded Files

The following files are excluded from coverage:

- `dist/**` - Build output
- `**/*.config.ts` - Configuration files
- `**/*.test.ts` - Test files themselves
- `**/test/**` - Test utilities
- `src/main.tsx` - Entry points
- `src/vite-env.d.ts` - Type definitions

## Test Utilities

### Shell Test Utilities (`apps/website/src/test/`)

#### `renderWithRouter()`

Renders component with BrowserRouter:

```tsx
renderWithRouter(<Component />);
```

#### `renderWithAuth()`

Renders component with AuthProvider + Router:

```tsx
renderWithAuth(<Component />);
```

#### `mockUser`

Mock user object for testing:

```tsx
{
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
}
```

### MFE Test Utilities (`apps/mfe-widget/src/test/`)

#### `renderWithRouter()`

Renders component with MemoryRouter:

```tsx
renderWithRouter(<Component />, {
  initialEntries: ["/dashboard"],
});
```

#### `mockAuthGlobal()`

Mocks window.**AUTH** global:

```tsx
mockAuthGlobal({
  isAuthenticated: true,
  user: mockUser,
  getAccessToken: () => "token",
});
```

#### `clearAuthGlobal()`

Clears window.**AUTH**:

```tsx
clearAuthGlobal();
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad**: Testing internal state

```tsx
expect(component.state.count).toBe(5);
```

✅ **Good**: Testing user-visible behavior

```tsx
expect(screen.getByText("Count: 5")).toBeInTheDocument();
```

### 2. Use Testing Library Queries

**Query Priority** (from most to least preferred):

1. `getByRole` - Accessible to all users
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Inputs
4. `getByText` - Non-interactive elements
5. `getByTestId` - Last resort

### 3. Clean Up After Tests

```tsx
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
```

### 4. Mock External Dependencies

```tsx
import { vi } from "vitest";
import * as apiClient from "./apiClient.js";

const mockFetch = vi.fn();
vi.spyOn(apiClient, "fetchData").mockImplementation(mockFetch);
```

### 5. Use Fake Timers for setTimeout/setInterval

```tsx
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it("should execute after delay", () => {
  const callback = vi.fn();
  setTimeout(callback, 1000);

  vi.advanceTimersByTime(1000);

  expect(callback).toHaveBeenCalled();
});
```

### 6. Test Accessibility

```tsx
import { screen } from "@testing-library/react";

it("should be accessible", () => {
  render(<Button>Click me</Button>);

  const button = screen.getByRole("button", { name: "Click me" });
  expect(button).toBeInTheDocument();
});
```

### 7. Keep Tests Focused

Each test should verify **one thing**:

```tsx
// ❌ Bad: Testing multiple things
it("should handle everything", () => {
  // ... 50 lines of tests
});

// ✅ Good: Focused tests
it("should render title", () => {
  /* ... */
});
it("should handle click", () => {
  /* ... */
});
it("should validate input", () => {
  /* ... */
});
```

## Troubleshooting

### "Invalid Chai property: toBeInTheDocument"

Make sure you have imported jest-dom in your setup file:

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
```

### "Cannot find module" errors

Ensure you're using `.js` extensions for imports in test files:

```tsx
// ✅ Correct
import { MyComponent } from "./MyComponent.js";

// ❌ Wrong
import { MyComponent } from "./MyComponent";
```

### Infinite loop with React Router Navigate

This is a known issue when testing redirects. Skip the test or mock the Navigate component:

```tsx
it.skip("should redirect when not authenticated", () => {
  // TODO: Fix infinite loop with Navigate
});
```

### "Maximum call stack size exceeded"

Usually caused by infinite re-renders. Check:

1. Are you mocking hooks correctly?
2. Is useEffect missing dependencies?
3. Is there a redirect loop?

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro)

## Questions?

For questions or issues with testing, please:

1. Check this documentation
2. Review existing test files for examples
3. Ask in the team chat
4. Create a GitHub issue
