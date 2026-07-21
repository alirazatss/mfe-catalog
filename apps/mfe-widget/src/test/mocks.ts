/**
 * Mock user data for testing
 */
export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
};

/**
 * Mock window.__AUTH__ global
 */
export function mockAuthGlobal(overrides?: Partial<typeof window.__AUTH__>) {
  (window as any).__AUTH__ = {
    isAuthenticated: true,
    user: mockUser,
    getAccessToken: () => "mock-access-token",
    ...overrides,
  };
}

/**
 * Clear window.__AUTH__ global
 */
export function clearAuthGlobal() {
  delete (window as any).__AUTH__;
}
