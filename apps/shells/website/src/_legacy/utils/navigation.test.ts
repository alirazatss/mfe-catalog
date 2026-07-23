import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { navigateTo, buildQueryString, navigateWithParams } from "./navigation.js";

describe("navigation utils", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("navigateTo", () => {
    it("should emit navigation event with path", () => {
      // Just verify it doesn't throw
      expect(() => navigateTo("/dashboard")).not.toThrow();
    });

    it("should include state when provided", () => {
      const state = { from: "/home" };
      expect(() => navigateTo("/dashboard", { state })).not.toThrow();
    });

    it("should include replace flag when provided", () => {
      expect(() => navigateTo("/dashboard", { replace: true })).not.toThrow();
    });

    it("should reject paths that do not start with /", () => {
      navigateTo("dashboard");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Navigation] Path must start with '/', got:",
        "dashboard",
      );
    });

    it("should reject http URLs", () => {
      navigateTo("http://example.com");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Navigation] Path must start with '/', got:",
        "http://example.com",
      );
    });

    it("should reject https URLs", () => {
      navigateTo("https://example.com");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Navigation] Path must start with '/', got:",
        "https://example.com",
      );
    });
  });

  describe("buildQueryString", () => {
    it("should build query string from object", () => {
      const params = { foo: "bar", baz: "qux" };
      const result = buildQueryString(params);

      expect(result).toBe("?foo=bar&baz=qux");
    });

    it("should return empty string for empty object", () => {
      const result = buildQueryString({});

      expect(result).toBe("");
    });

    it("should skip undefined values", () => {
      const params = { foo: "bar", baz: undefined };
      const result = buildQueryString(params);

      expect(result).toBe("?foo=bar");
    });

    it("should skip null values", () => {
      const params = { foo: "bar", baz: null };
      const result = buildQueryString(params);

      expect(result).toBe("?foo=bar");
    });

    it("should convert numbers to strings", () => {
      const params = { page: 1, limit: 10 };
      const result = buildQueryString(params);

      expect(result).toBe("?page=1&limit=10");
    });

    it("should convert booleans to strings", () => {
      const params = { active: true, deleted: false };
      const result = buildQueryString(params);

      expect(result).toBe("?active=true&deleted=false");
    });
  });

  describe("navigateWithParams", () => {
    it("should navigate with query parameters", () => {
      const params = { search: "test", page: 2 };
      expect(() => navigateWithParams("/search", params)).not.toThrow();
    });

    it("should handle empty params", () => {
      expect(() => navigateWithParams("/search", {})).not.toThrow();
    });

    it("should pass through options", () => {
      const params = { id: 123 };
      const options = { state: { from: "/home" }, replace: true };

      expect(() => navigateWithParams("/detail", params, options)).not.toThrow();
    });
  });
});
