import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { emitMFEEvent, onMFEEvent, MFE_EVENTS } from "./helpers.js";
import { eventBus } from "./EventBus.js";

describe("helpers", () => {
  beforeEach(() => {
    // Clear any existing listeners
    vi.clearAllMocks();
  });

  describe("emitMFEEvent", () => {
    it("should emit AUTH_LOGIN event with correct payload", () => {
      const handler = vi.fn();
      const cleanup = eventBus.on(MFE_EVENTS.AUTH_LOGIN, handler);

      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, {
        user: { id: "123", email: "user@example.com" },
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledWith({
        user: { id: "123", email: "user@example.com" },
        timestamp: expect.any(Number),
      });

      cleanup();
    });

    it("should emit AUTH_LOGOUT event with correct payload", () => {
      const handler = vi.fn();
      const cleanup = eventBus.on(MFE_EVENTS.AUTH_LOGOUT, handler);

      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "user_initiated",
      });

      expect(handler).toHaveBeenCalledWith({
        reason: "user_initiated",
      });

      cleanup();
    });

    it("should emit AUTH_REFRESH event with correct payload", () => {
      const handler = vi.fn();
      const cleanup = eventBus.on(MFE_EVENTS.AUTH_REFRESH, handler);

      emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {
        newToken: "abc123",
        expiresAt: 1234567890,
      });

      expect(handler).toHaveBeenCalledWith({
        newToken: "abc123",
        expiresAt: 1234567890,
      });

      cleanup();
    });

    it("should emit NAVIGATE event with correct payload", () => {
      const handler = vi.fn();
      const cleanup = eventBus.on(MFE_EVENTS.NAVIGATE, handler);

      emitMFEEvent(MFE_EVENTS.NAVIGATE, {
        path: "/dashboard",
        state: { from: "/home" },
        replace: false,
      });

      expect(handler).toHaveBeenCalledWith({
        path: "/dashboard",
        state: { from: "/home" },
        replace: false,
      });

      cleanup();
    });

    it("should emit ERROR_API_FAILED event with correct payload", () => {
      const handler = vi.fn();
      const cleanup = eventBus.on(MFE_EVENTS.ERROR_API_FAILED, handler);

      const error = new Error("Failed to fetch");
      emitMFEEvent(MFE_EVENTS.ERROR_API_FAILED, {
        endpoint: "/api/users",
        status: 500,
        error,
      });

      expect(handler).toHaveBeenCalledWith({
        endpoint: "/api/users",
        status: 500,
        error,
      });

      cleanup();
    });
  });

  describe("onMFEEvent", () => {
    it("should register listener and return cleanup function", () => {
      const handler = vi.fn();
      const cleanup = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, handler);

      expect(typeof cleanup).toBe("function");

      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, {
        user: { id: "123", email: "test@example.com" },
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledWith({
        user: { id: "123", email: "test@example.com" },
        timestamp: expect.any(Number),
      });

      cleanup();
    });

    it("should cleanup listener when cleanup is called", () => {
      const handler = vi.fn();
      const cleanup = onMFEEvent(MFE_EVENTS.NAVIGATE, handler);

      emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/page1" });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();

      emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/page2" });
      expect(handler).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should provide type-safe payload to handler", () => {
      const handler = vi.fn((data) => {
        // TypeScript should infer the correct type
        expect(data).toHaveProperty("user");
        expect(data).toHaveProperty("timestamp");
      });

      const cleanup = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, handler);

      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, {
        user: { id: "456", email: "user2@example.com" },
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalled();

      cleanup();
    });

    it("should work with multiple listeners on same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const cleanup1 = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, handler1);
      const cleanup2 = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, handler2);

      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "session_timeout",
      });

      expect(handler1).toHaveBeenCalledWith({ reason: "session_timeout" });
      expect(handler2).toHaveBeenCalledWith({ reason: "session_timeout" });

      cleanup1();
      cleanup2();
    });
  });

  describe("MFE_EVENTS constants", () => {
    it("should export all expected event names", () => {
      expect(MFE_EVENTS.AUTH_LOGIN).toBe("mfe:auth:login");
      expect(MFE_EVENTS.AUTH_LOGOUT).toBe("mfe:auth:logout");
      expect(MFE_EVENTS.AUTH_REFRESH).toBe("mfe:auth:refresh");
      expect(MFE_EVENTS.NAVIGATE).toBe("mfe:navigate");
      expect(MFE_EVENTS.ERROR_API_FAILED).toBe("mfe:error:api-failed");
      expect(MFE_EVENTS.ERROR_MFE_LOAD_FAILED).toBe("mfe:error:mfe-load-failed");
      expect(MFE_EVENTS.ERROR_COMPONENT_FAILED).toBe("mfe:error:component-failed");
    });

    it("should maintain consistent naming convention", () => {
      Object.values(MFE_EVENTS).forEach((eventName) => {
        expect(eventName).toMatch(/^mfe:/);
      });
    });
  });

  describe("integration tests", () => {
    it("should handle auth flow events in sequence", () => {
      const loginHandler = vi.fn();
      const refreshHandler = vi.fn();
      const logoutHandler = vi.fn();

      const cleanup1 = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, loginHandler);
      const cleanup2 = onMFEEvent(MFE_EVENTS.AUTH_REFRESH, refreshHandler);
      const cleanup3 = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, logoutHandler);

      // Simulate auth flow
      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, {
        user: { id: "123", email: "user@example.com" },
        timestamp: Date.now(),
      });

      emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {
        newToken: "refreshed-token",
      });

      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "user_initiated",
      });

      expect(loginHandler).toHaveBeenCalledTimes(1);
      expect(refreshHandler).toHaveBeenCalledTimes(1);
      expect(logoutHandler).toHaveBeenCalledTimes(1);

      cleanup1();
      cleanup2();
      cleanup3();
    });

    it("should handle navigation events from different MFEs", () => {
      const navHandler = vi.fn();
      const cleanup = onMFEEvent(MFE_EVENTS.NAVIGATE, navHandler);

      // MFE 1 navigates
      emitMFEEvent(MFE_EVENTS.NAVIGATE, {
        path: "/mfe1/page",
        state: { source: "mfe1" },
      });

      // MFE 2 navigates
      emitMFEEvent(MFE_EVENTS.NAVIGATE, {
        path: "/mfe2/page",
        state: { source: "mfe2" },
      });

      expect(navHandler).toHaveBeenCalledTimes(2);
      expect(navHandler).toHaveBeenNthCalledWith(1, {
        path: "/mfe1/page",
        state: { source: "mfe1" },
      });
      expect(navHandler).toHaveBeenNthCalledWith(2, {
        path: "/mfe2/page",
        state: { source: "mfe2" },
      });

      cleanup();
    });

    it("should handle error events from different sources", () => {
      const errorHandler = vi.fn();
      const cleanup = onMFEEvent(MFE_EVENTS.ERROR_API_FAILED, errorHandler);

      emitMFEEvent(MFE_EVENTS.ERROR_API_FAILED, {
        endpoint: "/api/data",
        status: 500,
        error: new Error("Failed to fetch data"),
      });

      emitMFEEvent(MFE_EVENTS.ERROR_API_FAILED, {
        endpoint: "/api/users",
        status: 404,
        error: new Error("Not found"),
      });

      expect(errorHandler).toHaveBeenCalledTimes(2);

      cleanup();
    });
  });
});
