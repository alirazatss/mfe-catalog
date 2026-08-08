/**
 * App config loading tests for website shell.
 *
 * Tests the boot-time loading and validation of /app-config.json.
 * Covers: SBV-1 (validation before runtime start), SBV-2 (mode-dependent fallback).
 */

import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { loadShellAppConfig, DEV_FALLBACK_CONFIG } from "./app-config.js";
import type { AppConfig } from "@mfe-runtime/app-config";
import { parseAppConfig } from "@mfe-runtime/app-config";

describe("loadShellAppConfig", () => {
  const validConfig: AppConfig = {
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
    vi.restoreAllMocks();
  });

  describe("SBV-1: Valid config boots the shell", () => {
    it("successfully loads valid config from /app-config.json", async () => {
      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => validConfig,
      } as unknown as Response);

      const result = await loadShellAppConfig();

      expect(result.config).toEqual(validConfig);
      expect(result.source).toBe("remote");
      expect(mockFetch).toHaveBeenCalledWith("/app-config.json", expect.any(Object));
    });
  });

  describe("SBV-1: Invalid config renders configuration error", () => {
    it("throws ConfigError when schema validation fails", async () => {
      const invalidConfig = {
        schemaVersion: "0.1.0",
        // missing required fields
      };

      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => invalidConfig,
      } as unknown as Response);

      await expect(loadShellAppConfig("production")).rejects.toMatchObject({
        category: "validation",
      });
    });

    it("includes field paths in validation error", async () => {
      const invalidConfig = {
        schemaVersion: "0.1.0",
        apiBaseUrl: "not-a-url",
        auth: {
          keycloakUrl: "also-not-a-url",
        },
      };

      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidConfig,
      } as unknown as Response);

      try {
        await loadShellAppConfig("production");
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toHaveProperty("category", "validation");
        // Should report multiple field violations
        const message = err instanceof Error ? err.message : "";
        expect(message).toContain("apiBaseUrl");
      }
    });
  });

  describe("SBV-2: Dev fallback on missing file", () => {
    it("uses built-in fallback when fetch fails in dev mode", async () => {
      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await loadShellAppConfig("development");

      expect(result.config).toBeDefined();
      expect(result.source).toBe("fallback");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Using built-in fallback"),
      );
    });
  });

  describe("SBV-2: Production refuses to boot without config", () => {
    it("throws ConfigError when fetch fails in production mode", async () => {
      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(loadShellAppConfig("production")).rejects.toMatchObject({
        category: "fetch",
      });
    });

    it("throws ConfigError when response is non-OK in production", async () => {
      const mockFetch = vi.spyOn(global, "fetch");
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(loadShellAppConfig("production")).rejects.toMatchObject({
        category: "fetch",
      });
    });
  });
});

describe("DEV_FALLBACK_CONFIG", () => {
  it("is valid according to the schema", () => {
    const result = parseAppConfig(DEV_FALLBACK_CONFIG);
    expect(result.success).toBe(true);
  });
});
