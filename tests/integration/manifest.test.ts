import { describe, it, expect } from "vite-plus/test";
import { readFile } from "fs/promises";
import { join } from "path";
import { validateRemoteConfig } from "@mfe-runtine/remote-config";

/**
 * Integration tests for manifest loading and validation.
 *
 * These tests exercise the real config fetching and validation logic
 * without mocks, using actual JSON fixtures.
 */
describe("Manifest loading", () => {
  describe("Valid manifest", () => {
    it("should load and validate successfully", async () => {
      const manifestPath = join(__dirname, "fixtures", "valid-manifest.json");
      const content = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(content);

      // Should not throw
      expect(() => validateRemoteConfig(manifest)).not.toThrow();

      // Verify structure
      expect(manifest.schemaVersion).toBe("2.0.0");
      expect(manifest.chrome).toBeDefined();
      expect(manifest.chrome.header).toBeDefined();
      expect(manifest.chrome.header.mfe).toBe("test-header");
      expect(manifest.features).toBeDefined();
      expect(manifest.features["/widget"]).toBeDefined();
    });
  });

  describe("Invalid manifest", () => {
    it("should reject manifest with missing required fields", async () => {
      const manifestPath = join(__dirname, "fixtures", "invalid-manifest.json");
      const content = await readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(content);

      // Should throw validation error
      expect(() => validateRemoteConfig(manifest)).toThrow("validation failed");
    });
  });

  describe("Malformed JSON", () => {
    it("should reject non-JSON content", () => {
      const invalidJson = "{ not valid json }";

      expect(() => JSON.parse(invalidJson)).toThrow();
    });
  });
});
