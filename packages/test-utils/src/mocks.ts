/**
 * @mfe-runtime/test-utils — Test mocks and render helpers
 *
 * Implements shared-test-utils / Shared test mocks and render helpers.
 * See openspec/changes/shared-boilerplate-packages/specs/shared-test-utils/spec.md
 *
 * Provides auth global mocks and router-aware render helpers for testing.
 */

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
};

/**
 * Mock window.__MFE_AUTH__ global for testing.
 *
 * Sets up a mock authenticated state that components can read from.
 *
 * @param overrides - Optional overrides for specific auth bridge properties
 *
 * @example
 * ```ts
 * import { mockAuthGlobal, clearAuthGlobal } from "@mfe-runtime/test-utils";
 *
 * beforeEach(() => {
 *   mockAuthGlobal({ isAuthenticated: () => true });
 * });
 *
 * afterEach(() => {
 *   clearAuthGlobal();
 * });
 * ```
 */
export function mockAuthGlobal(overrides?: Record<string, any>) {
  (window as any).__MFE_AUTH__ = {
    version: "1.0.0",
    getToken: () => "mock-access-token",
    isAuthenticated: () => true,
    onTokenChange: () => () => {},
    logout: async () => {},
    ...overrides,
  };
}

/**
 * Clear window.__MFE_AUTH__ global after tests.
 *
 * Restores a clean global state for subsequent tests.
 */
export function clearAuthGlobal() {
  delete (window as any).__MFE_AUTH__;
}
