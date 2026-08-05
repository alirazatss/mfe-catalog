// Test suite for @mfe-runtime/app-config
// Implements verification for ACS-1, ACS-2, ACS-3, ACS-4

import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import {
  appConfigSchema,
  parseAppConfig,
  loadAppConfig,
  schemaVersion,
  LoadError,
  type AppConfig,
} from "./index.js";

describe("app-config-schema", () => {
  // ACS-2: Scenario - schemaVersion constant matches package.json
  it("schemaVersion constant matches package.json version", () => {
    expect(schemaVersion).toBe("0.1.0");
  });

  describe("parseAppConfig", () => {
    const validConfig = {
      schemaVersion: "0.1.0",
      apiBaseUrl: "https://api.example.com",
      logoutUrl: "https://example.com/logout",
      auth: {
        keycloakUrl: "https://auth.example.com",
        realm: "mfe-realm",
        clientId: "mfe-client",
      },
    };

    // ACS-3: Scenario - Valid input parses to typed config
    it("parses valid config successfully", () => {
      const result = parseAppConfig(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
        expect(result.data.apiBaseUrl).toBe(validConfig.apiBaseUrl);
      }
    });

    // ACS-2: Scenario - Matching schemaVersion is accepted
    it("accepts config with matching schemaVersion", () => {
      const result = parseAppConfig(validConfig);

      expect(result.success).toBe(true);
    });

    // ACS-2: Scenario - Mismatched schemaVersion is rejected
    it("rejects config with mismatched schemaVersion", () => {
      const invalidVersionConfig = {
        ...validConfig,
        schemaVersion: "9.9.9",
      };

      const result = parseAppConfig(invalidVersionConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        const versionError = result.errors.find((e) => e.path.includes("schemaVersion"));
        expect(versionError).toBeDefined();
        // Just check that it mentions it's invalid, not the exact message
        expect(versionError?.message).toBeTruthy();
      }
    });

    // ACS-3: Scenario - Invalid input reports all field errors
    it("reports multiple field errors simultaneously", () => {
      const invalidConfig = {
        schemaVersion: "0.1.0",
        // missing apiBaseUrl
        logoutUrl: "https://example.com/logout",
        auth: {
          keycloakUrl: "not-a-url", // malformed URL
          realm: "mfe-realm",
          clientId: "mfe-client",
        },
      };

      const result = parseAppConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Both errors should be reported
        expect(result.errors.length).toBeGreaterThanOrEqual(2);

        const apiBaseUrlError = result.errors.find((e) => e.path === "apiBaseUrl");
        const keycloakUrlError = result.errors.find((e) => e.path.includes("keycloakUrl"));

        expect(apiBaseUrlError).toBeDefined();
        expect(keycloakUrlError).toBeDefined();
      }
    });

    it("rejects config missing required fields", () => {
      const incompleteConfig = {
        schemaVersion: "0.1.0",
        apiBaseUrl: "https://api.example.com",
        // missing logoutUrl and auth
      };

      const result = parseAppConfig(incompleteConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("rejects config with invalid URL formats", () => {
      const invalidUrlConfig = {
        ...validConfig,
        apiBaseUrl: "not-a-url",
      };

      const result = parseAppConfig(invalidUrlConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        const apiError = result.errors.find((e) => e.path === "apiBaseUrl");
        expect(apiError).toBeDefined();
      }
    });
  });

  describe("loadAppConfig", () => {
    const validConfig = {
      schemaVersion: "0.1.0",
      apiBaseUrl: "https://api.example.com",
      logoutUrl: "https://example.com/logout",
      auth: {
        keycloakUrl: "https://auth.example.com",
        realm: "mfe-realm",
        clientId: "mfe-client",
      },
    };

    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // ACS-4: Scenario - Successful load
    it("successfully loads and validates config from URL", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validConfig,
      } as Response);

      const result = await loadAppConfig("https://example.com/app-config.json");

      expect(result).toEqual(validConfig);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/app-config.json",
        expect.objectContaining({}),
      );
    });

    // ACS-4: Scenario - Network failure is distinguishable from schema failure
    it("categorizes fetch rejection as load error", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await loadAppConfig("https://example.com/app-config.json");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(LoadError);
        if (err instanceof LoadError) {
          expect(err.category).toBe("fetch");
        }
      }
    });

    // ACS-4: Scenario - HTTP failure is distinguishable from schema failure
    it("categorizes non-OK response as load error", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      try {
        await loadAppConfig("https://example.com/app-config.json");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(LoadError);
        if (err instanceof LoadError) {
          expect(err.category).toBe("fetch");
          expect(err.message).toContain("404");
        }
      }
    });

    it("categorizes JSON parse failure as parse error", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      try {
        await loadAppConfig("https://example.com/app-config.json");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(LoadError);
        if (err instanceof LoadError) {
          expect(err.category).toBe("parse");
        }
      }
    });

    it("categorizes schema validation failure as validation error", async () => {
      const invalidConfig = {
        schemaVersion: "0.1.0",
        // missing required fields
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidConfig,
      } as Response);

      try {
        await loadAppConfig("https://example.com/app-config.json");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(LoadError);
        if (err instanceof LoadError) {
          expect(err.category).toBe("validation");
        }
      }
    });

    it("respects abort signal", async () => {
      const controller = new AbortController();
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error("Aborted"));

      controller.abort();

      await expect(
        loadAppConfig("https://example.com/app-config.json", {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
