import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { tokenManager } from "./TokenManager.js";
import { MFE_EVENTS } from "@mfe-runtime/events";

describe("TokenManager", () => {
  // Mock timers
  beforeEach(() => {
    vi.useFakeTimers();
    tokenManager.clear(); // Reset state before each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe("setAccessToken", () => {
    it("should store access token correctly", () => {
      const token = "test-token-123";

      tokenManager.setAccessToken(token, 3600);

      expect(tokenManager.getAccessToken()).toBe(token);
      expect(tokenManager.isAuthenticated()).toBe(true);
    });

    it("should schedule refresh at 80% lifetime when expiresIn is provided", () => {
      const expiresIn = 1000; // 1000 seconds
      const expectedDelay = expiresIn * 1000 * 0.8; // 800 seconds in ms

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      tokenManager.setAccessToken("test-token", expiresIn);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelay);
    });

    it("should decode JWT and schedule refresh when expiresIn is not provided", () => {
      // Create a valid JWT with exp claim (1 hour from now)
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(JSON.stringify({ exp, sub: "user-123" }));
      const signature = "fake-signature";
      const jwt = `${header}.${payload}.${signature}`;

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      tokenManager.setAccessToken(jwt);

      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(tokenManager.getAccessToken()).toBe(jwt);
    });

    it("should not schedule refresh when JWT decoding fails", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      tokenManager.setAccessToken("invalid-jwt");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TokenManager] Failed to decode JWT:",
        expect.any(Error),
      );
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });
  });

  describe("getAccessToken", () => {
    it("should return stored token", () => {
      tokenManager.setAccessToken("my-token", 3600);

      expect(tokenManager.getAccessToken()).toBe("my-token");
    });

    it("should return null when no token is set", () => {
      expect(tokenManager.getAccessToken()).toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when token exists", () => {
      tokenManager.setAccessToken("test-token", 3600);

      expect(tokenManager.isAuthenticated()).toBe(true);
    });

    it("should return false when no token exists", () => {
      expect(tokenManager.isAuthenticated()).toBe(false);
    });

    it("should return false after clear", () => {
      tokenManager.setAccessToken("test-token", 3600);
      tokenManager.clear();

      expect(tokenManager.isAuthenticated()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove token", () => {
      tokenManager.setAccessToken("test-token", 3600);
      tokenManager.clear();

      expect(tokenManager.getAccessToken()).toBeNull();
      expect(tokenManager.isAuthenticated()).toBe(false);
    });

    it("should cancel refresh timer", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      tokenManager.setAccessToken("test-token", 3600);
      tokenManager.clear();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("scheduleRefresh", () => {
    it("should calculate 80% lifetime correctly", () => {
      const expiresIn = 1000; // 1000 seconds
      const expectedDelay = expiresIn * 1000 * 0.8;

      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      tokenManager.setAccessToken("test-token", expiresIn);

      const actualDelay = setTimeoutSpy.mock.calls[0][1];
      expect(actualDelay).toBe(expectedDelay);
    });

    it("should refresh immediately when token is expired", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "new-token", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Create expired token (exp in the past)
      const exp = Math.floor(Date.now() / 1000) - 100;
      const jwt = createMockJWT({ exp });

      tokenManager.setAccessToken(jwt);

      // Should trigger immediate refresh
      await vi.runAllTimersAsync();

      expect(fetchSpy).toHaveBeenCalledWith("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
    });

    it("should clear existing timer before scheduling new one", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

      tokenManager.setAccessToken("token-1", 3600);
      tokenManager.setAccessToken("token-2", 3600);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    it("should call refresh API with credentials", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "new-token", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await tokenManager.refreshToken();

      expect(fetchSpy).toHaveBeenCalledWith("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
    });

    it("should update token on successful refresh", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "refreshed-token", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      tokenManager.setAccessToken("old-token", 3600);
      await tokenManager.refreshToken();

      expect(tokenManager.getAccessToken()).toBe("refreshed-token");
    });

    it("should emit AUTH_REFRESH event on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ accessToken: "new-token", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const eventSpy = vi.fn();
      const { eventBus } = await import("@mfe-runtime/events");
      const cleanup = eventBus.on(MFE_EVENTS.AUTH_REFRESH, eventSpy);

      await tokenManager.refreshToken();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          newToken: "new-token",
        }),
      );

      cleanup();
    });

    it("should clear tokens and emit AUTH_LOGOUT on failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Unauthorized", { status: 401 }),
      );

      const eventSpy = vi.fn();
      const { eventBus } = await import("@mfe-runtime/events");
      const cleanup = eventBus.on(MFE_EVENTS.AUTH_LOGOUT, eventSpy);

      tokenManager.setAccessToken("test-token", 3600);
      await tokenManager.refreshToken();

      expect(tokenManager.getAccessToken()).toBeNull();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "refresh_failed",
        }),
      );

      cleanup();
    });

    it("should deduplicate simultaneous refresh calls", async () => {
      let resolveRefresh: (value: Response) => void;
      const refreshPromise = new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(refreshPromise);

      // Call refresh multiple times simultaneously
      const promises = [
        tokenManager.refreshToken(),
        tokenManager.refreshToken(),
        tokenManager.refreshToken(),
      ];

      // Wait a bit to ensure all calls are registered
      await vi.waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(1);
      });

      // Resolve the refresh
      resolveRefresh(
        new Response(JSON.stringify({ accessToken: "new-token", expiresIn: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      await Promise.all(promises);

      // Should only call API once
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("decodeJWT", () => {
    it("should decode valid JWT payload", () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const jwt = createMockJWT({ exp, sub: "user-123", role: "admin" });

      tokenManager.setAccessToken(jwt);

      expect(tokenManager.getAccessToken()).toBe(jwt);
    });

    it("should throw error on invalid JWT format", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      tokenManager.setAccessToken("not.a.valid.jwt.format");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TokenManager] Failed to decode JWT:",
        expect.any(Error),
      );
    });

    it("should handle base64url encoding correctly", () => {
      // Create JWT with special characters that differ in base64 vs base64url
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600, special: "test+/=" };
      const jwt = createMockJWT(payload);

      tokenManager.setAccessToken(jwt);

      expect(tokenManager.getAccessToken()).toBe(jwt);
    });
  });
});

// Helper function to create mock JWT tokens
function createMockJWT(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const signature = "mock-signature";
  return `${header}.${encodedPayload}.${signature}`;
}
