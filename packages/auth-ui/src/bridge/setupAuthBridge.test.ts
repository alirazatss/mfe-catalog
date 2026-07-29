import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { setupAuthBridge, teardownAuthBridge } from "./setupAuthBridge.js";
import { tokenManager } from "@mfe-runtime/auth";
import { emitMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";

declare global {
  interface Window {
    __MFE_AUTH__?: unknown;
  }
}

describe("setupAuthBridge", () => {
  beforeEach(() => {
    teardownAuthBridge();
    tokenManager.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    teardownAuthBridge();
    tokenManager.clear();
  });

  it("installs window.__MFE_AUTH__ with expected shape", () => {
    const bridge = setupAuthBridge();
    expect(window.__MFE_AUTH__).toBe(bridge);
    expect(bridge.version).toBe("1.0.0");
    expect(typeof bridge.getToken).toBe("function");
    expect(typeof bridge.isAuthenticated).toBe("function");
    expect(typeof bridge.onTokenChange).toBe("function");
    expect(typeof bridge.logout).toBe("function");
  });

  it("is idempotent — second setup returns the same instance", () => {
    const first = setupAuthBridge();
    const second = setupAuthBridge();
    expect(second).toBe(first);
  });

  it("getToken proxies to tokenManager", () => {
    const bridge = setupAuthBridge();
    vi.spyOn(tokenManager, "getAccessToken").mockReturnValue("tok-123");
    expect(bridge.getToken()).toBe("tok-123");
  });

  it("isAuthenticated proxies to tokenManager", () => {
    const bridge = setupAuthBridge();
    vi.spyOn(tokenManager, "isAuthenticated").mockReturnValue(true);
    expect(bridge.isAuthenticated()).toBe(true);
  });

  it("onTokenChange fires on refresh event", () => {
    const bridge = setupAuthBridge();
    const cb = vi.fn();
    vi.spyOn(tokenManager, "getAccessToken").mockReturnValue("new-token");

    const cleanup = bridge.onTokenChange(cb);
    emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {
      newToken: "new-token",
      expiresAt: Date.now() + 900_000,
    });

    expect(cb).toHaveBeenCalledWith("new-token");
    cleanup();
  });

  it("onTokenChange fires with null on logout event", () => {
    const bridge = setupAuthBridge();
    const cb = vi.fn();
    const cleanup = bridge.onTokenChange(cb);

    emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { reason: "user_initiated" });

    expect(cb).toHaveBeenCalledWith(null);
    cleanup();
  });

  it("cleanup returned by onTokenChange stops further invocations", () => {
    const bridge = setupAuthBridge();
    const cb = vi.fn();
    const cleanup = bridge.onTokenChange(cb);

    cleanup();
    emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { reason: "test" });
    expect(cb).not.toHaveBeenCalled();
  });

  it("logout POSTs to /api/auth/logout, clears tokenManager, emits logout event", async () => {
    const bridge = setupAuthBridge();
    const clearSpy = vi.spyOn(tokenManager, "clear");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await bridge.logout();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(clearSpy).toHaveBeenCalled();
  });

  it("logout still clears local state when backend call fails", async () => {
    const bridge = setupAuthBridge();
    const clearSpy = vi.spyOn(tokenManager, "clear");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    await bridge.logout();

    expect(clearSpy).toHaveBeenCalled();
  });

  it("teardownAuthBridge removes the global", () => {
    setupAuthBridge();
    expect(window.__MFE_AUTH__).toBeDefined();
    teardownAuthBridge();
    expect(window.__MFE_AUTH__).toBeUndefined();
  });
});
