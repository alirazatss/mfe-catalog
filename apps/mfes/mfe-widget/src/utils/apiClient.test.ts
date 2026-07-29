import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { apiClient, setupAuthListeners } from "./apiClient.js";
import { mockAuthGlobal, clearAuthGlobal } from "../test/mocks.js";
import { MFE_EVENTS } from "@mfe-runtime/events";

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAuthGlobal();
  });

  describe("request interceptor", () => {
    it("should inject access token from window.__AUTH__", async () => {
      mockAuthGlobal();

      const mockAdapter = vi.fn().mockResolvedValue({ data: {} });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get("/test");

      expect(mockAdapter).toHaveBeenCalled();
      const config = mockAdapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBe("Bearer mock-access-token");
    });

    it("should handle missing window.__AUTH__", async () => {
      clearAuthGlobal();

      const mockAdapter = vi.fn().mockResolvedValue({ data: {} });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get("/test");

      expect(mockAdapter).toHaveBeenCalled();
      const config = mockAdapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it("should handle missing getAccessToken function", async () => {
      (window as any).__AUTH__ = {};

      const mockAdapter = vi.fn().mockResolvedValue({ data: {} });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get("/test");

      expect(mockAdapter).toHaveBeenCalled();
      const config = mockAdapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it("should handle null token", async () => {
      mockAuthGlobal({
        getAccessToken: () => null,
      });

      const mockAdapter = vi.fn().mockResolvedValue({ data: {} });
      apiClient.defaults.adapter = mockAdapter;

      await apiClient.get("/test");

      expect(mockAdapter).toHaveBeenCalled();
      const config = mockAdapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });
  });

  describe("response interceptor - 401 auto-retry", () => {
    it("should retry request after 401 with new token", async () => {
      let callCount = 0;
      const mockAdapter = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: return 401
          return Promise.reject({
            response: { status: 401 },
            config: { headers: {} },
          });
        }
        // Second call: return success
        return Promise.resolve({ data: { success: true } });
      });

      apiClient.defaults.adapter = mockAdapter;
      mockAuthGlobal();

      const response = await apiClient.get("/test");

      expect(callCount).toBe(2);
      expect(response.data).toEqual({ success: true });
    });

    it("should not retry if _retry flag is set", async () => {
      const mockAdapter = vi.fn().mockRejectedValue({
        response: { status: 401 },
        config: { headers: {}, _retry: true },
      });

      apiClient.defaults.adapter = mockAdapter;
      mockAuthGlobal();

      await expect(apiClient.get("/test")).rejects.toMatchObject({
        response: { status: 401 },
      });

      expect(mockAdapter).toHaveBeenCalledTimes(1);
    });

    it("should not retry non-401 errors", async () => {
      const mockAdapter = vi.fn().mockRejectedValue({
        response: { status: 500 },
        config: { headers: {} },
      });

      apiClient.defaults.adapter = mockAdapter;
      mockAuthGlobal();

      await expect(apiClient.get("/test")).rejects.toMatchObject({
        response: { status: 500 },
      });

      expect(mockAdapter).toHaveBeenCalledTimes(1);
    });

    it("should wait 200ms before retrying", async () => {
      vi.useFakeTimers();

      let callCount = 0;
      const mockAdapter = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({
            response: { status: 401 },
            config: { headers: {} },
          });
        }
        return Promise.resolve({ data: { success: true } });
      });

      apiClient.defaults.adapter = mockAdapter;
      mockAuthGlobal();

      const promise = apiClient.get("/test");

      // Fast-forward 200ms
      await vi.advanceTimersByTimeAsync(200);

      const response = await promise;

      expect(callCount).toBe(2);
      expect(response.data).toEqual({ success: true });

      vi.useRealTimers();
    });

    it("should fail if no token available after retry wait", async () => {
      const mockAdapter = vi.fn().mockRejectedValue({
        response: { status: 401 },
        config: { headers: {} },
      });

      apiClient.defaults.adapter = mockAdapter;
      mockAuthGlobal({
        getAccessToken: () => null, // No token available
      });

      await expect(apiClient.get("/test")).rejects.toMatchObject({
        response: { status: 401 },
      });
    });
  });

  describe("setupAuthListeners", () => {
    it("should register AUTH_LOGOUT event listener", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { eventBus } = await import("@mfe-runtime/events");

      setupAuthListeners();

      // Emit logout event via eventBus
      eventBus.emit(MFE_EVENTS.AUTH_LOGOUT, { reason: "user_initiated" });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[MFE] Auth logout event received:",
        "user_initiated",
      );
    });

    it("should register AUTH_REFRESH event listener", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const { eventBus } = await import("@mfe-runtime/events");

      setupAuthListeners();

      // Emit refresh event via eventBus
      eventBus.emit(MFE_EVENTS.AUTH_REFRESH, { newToken: "new-token" });

      expect(consoleSpy).toHaveBeenCalledWith("[MFE] Auth refresh event received");
    });
  });
});
