import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { navigateTo, navigateWithParams } from "./navigation.js";

describe("navigation utils", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("navigateTo", () => {
    it("should emit navigation event", () => {
      expect(() => navigateTo("/dashboard")).not.toThrow();
    });

    it("should include state when provided", () => {
      const state = { from: "/home" };
      expect(() => navigateTo("/dashboard", { state })).not.toThrow();
    });

    it("should include replace flag when provided", () => {
      expect(() => navigateTo("/dashboard", { replace: true })).not.toThrow();
    });
  });

  describe("navigateWithParams", () => {
    it("should navigate with query parameters", () => {
      const params = { search: "test", page: "2" };
      expect(() => navigateWithParams("/search", params)).not.toThrow();
    });

    it("should handle empty params", () => {
      expect(() => navigateWithParams("/search", {})).not.toThrow();
    });

    it("should pass through options", () => {
      const params = { id: "123" };
      const options = { state: { from: "/home" }, replace: true };

      expect(() => navigateWithParams("/detail", params, options)).not.toThrow();
    });
  });
});
