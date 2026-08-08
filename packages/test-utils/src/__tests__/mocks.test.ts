import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mockAuthGlobal, clearAuthGlobal, mockUser } from "../mocks";

describe("mockAuthGlobal", () => {
  afterEach(() => {
    clearAuthGlobal();
  });

  it("sets up window.__MFE_AUTH__ global", () => {
    mockAuthGlobal();
    expect((window as any).__MFE_AUTH__).toBeDefined();
  });

  it("provides default authenticated state", () => {
    mockAuthGlobal();
    const auth = (window as any).__MFE_AUTH__;
    expect(auth.getToken()).toBe("mock-access-token");
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.version).toBe("1.0.0");
  });

  it("accepts custom overrides", () => {
    mockAuthGlobal({
      getToken: () => "custom-token",
      isAuthenticated: () => false,
    });

    const auth = (window as any).__MFE_AUTH__;
    expect(auth.getToken()).toBe("custom-token");
    expect(auth.isAuthenticated()).toBe(false);
  });

  it("provides logout function", async () => {
    mockAuthGlobal();
    const auth = (window as any).__MFE_AUTH__;
    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it("provides onTokenChange function", () => {
    mockAuthGlobal();
    const auth = (window as any).__MFE_AUTH__;
    const cleanup = auth.onTokenChange(() => {});
    expect(cleanup).toBeInstanceOf(Function);
  });
});

describe("clearAuthGlobal", () => {
  it("removes window.__MFE_AUTH__ global", () => {
    mockAuthGlobal();
    expect((window as any).__MFE_AUTH__).toBeDefined();

    clearAuthGlobal();
    expect((window as any).__MFE_AUTH__).toBeUndefined();
  });

  it("is safe to call without prior mock", () => {
    expect(() => clearAuthGlobal()).not.toThrow();
  });
});

describe("mockUser", () => {
  it("provides default test user data", () => {
    expect(mockUser).toEqual({
      id: "test-user-123",
      email: "test@example.com",
      name: "Test User",
    });
  });
});
