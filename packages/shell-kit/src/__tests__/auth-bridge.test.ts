import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { setupAuthBridge, type TokenManager } from "../auth-bridge";

describe("setupAuthBridge", () => {
  let mockTokenManager: TokenManager;

  beforeEach(() => {
    delete (window as any).__MFE_AUTH__;
    mockTokenManager = {
      getAccessToken: vi.fn(() => "test-token"),
      isAuthenticated: vi.fn(() => true),
      clear: vi.fn(),
    };
  });

  it("installs window.__MFE_AUTH__ bridge", () => {
    setupAuthBridge(mockTokenManager);
    expect((window as any).__MFE_AUTH__).toBeDefined();
    expect((window as any).__MFE_AUTH__.version).toBe("1.0.0");
  });

  it("returns existing bridge if already installed", () => {
    const bridge1 = setupAuthBridge(mockTokenManager);
    const bridge2 = setupAuthBridge(mockTokenManager);
    expect(bridge1).toBe(bridge2);
  });

  it("bridge.getToken() delegates to tokenManager", () => {
    const bridge = setupAuthBridge(mockTokenManager);
    expect(bridge.getToken()).toBe("test-token");
    expect(mockTokenManager.getAccessToken).toHaveBeenCalled();
  });

  it("bridge.isAuthenticated() delegates to tokenManager", () => {
    const bridge = setupAuthBridge(mockTokenManager);
    expect(bridge.isAuthenticated()).toBe(true);
    expect(mockTokenManager.isAuthenticated).toHaveBeenCalled();
  });

  it("bridge.logout() calls backend and clears tokenManager", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response)) as any;

    const bridge = setupAuthBridge(mockTokenManager);
    await bridge.logout();

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    expect(mockTokenManager.clear).toHaveBeenCalled();
  });

  it("bridge.logout() clears tokenManager even if backend call fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as any;

    const bridge = setupAuthBridge(mockTokenManager);
    await bridge.logout();

    expect(mockTokenManager.clear).toHaveBeenCalled();
  });

  it("bridge.onTokenChange() fires callback with new token on AUTH_REFRESH event", async () => {
    const { emitMFEEvent, MFE_EVENTS } = await import("@mfe-runtime/events");
    const bridge = setupAuthBridge(mockTokenManager);
    const callback = vi.fn();
    const cleanup = bridge.onTokenChange(callback);

    emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, { newToken: "new-token-abc" });
    expect(callback).toHaveBeenCalledWith("new-token-abc");

    // Also test fallback to tokenManager when no newToken provided
    callback.mockClear();
    emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {} as any);
    expect(callback).toHaveBeenCalledWith("test-token");

    cleanup();
  });

  it("bridge.onTokenChange() fires callback with null on AUTH_LOGOUT event", async () => {
    const { emitMFEEvent, MFE_EVENTS } = await import("@mfe-runtime/events");
    const bridge = setupAuthBridge(mockTokenManager);
    const callback = vi.fn();
    const cleanup = bridge.onTokenChange(callback);

    emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { reason: "test" });
    expect(callback).toHaveBeenCalledWith(null);

    cleanup();
  });

  it("bridge.onTokenChange() sets up event listeners", () => {
    const bridge = setupAuthBridge(mockTokenManager);
    const callback = vi.fn();

    const cleanup = bridge.onTokenChange(callback);
    expect(cleanup).toBeInstanceOf(Function);

    cleanup();
  });
});
