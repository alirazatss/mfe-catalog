// Implements release-channel-deployments Task 3.3: Config generation unit tests
// See: openspec/changes/release-channel-deployments/specs/config-generation/spec.md

import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { generateConfig } from "./config-generator.js";
import type { MicroFrontend } from "./types.js";

const mockMfes: MicroFrontend[] = [
  {
    name: "@mfe-runtime/mfe-widget",
    shortName: "mfe-widget",
    version: "1.0.0",
    port: 5174,
    scope: "widget",
    path: "/fake/path/mfe-widget",
  },
  {
    name: "@mfe-runtime/mfe-landing-page",
    shortName: "mfe-landing-page",
    version: "1.0.0",
    port: 5175,
    scope: "landingPage",
    path: "/fake/path/mfe-landing-page",
  },
];

describe("generateConfig", () => {
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch as any;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate development config with localhost URLs", async () => {
    const config = await generateConfig(mockMfes, {
      environment: "development",
    });

    expect(config.features["/widget"].entryUrl).toBe("http://localhost:5174/remoteEntry.js");
    expect(config.features["/landing-page"].entryUrl).toBe("http://localhost:5175/remoteEntry.js");
  });

  it("should generate production config with versioned URLs when no channel", async () => {
    const config = await generateConfig(mockMfes, {
      environment: "production",
      gitHash: "abc1234",
      baseUrl: "https://tssmfestorage.blob.core.windows.net/mfes-dev",
    });

    expect(config.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/vabc1234/remoteEntry.js",
    );
  });

  // Implements release-channel-deployments Task 3.3: channel URL emission test
  it("should use channel URL when channel provided and blob exists", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const config = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://tssmfestorage.blob.core.windows.net/mfes-dev",
      channel: "release-4.10",
    });

    expect(config.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/release-4.10/remoteEntry.js",
    );
    expect(config.features["/landing-page"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/release-4.10/remoteEntry.js",
    );
  });

  // Implements release-channel-deployments Task 3.3: dev fallback test
  it("should fallback to dev URL when channel build does not exist", async () => {
    // First MFE channel exists, second doesn't
    mockFetch.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });

    const config = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://tssmfestorage.blob.core.windows.net/mfes-dev",
      channel: "release-4.10",
    });

    // First MFE uses channel URL
    expect(config.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/release-4.10/remoteEntry.js",
    );

    // Second MFE falls back to dev
    expect(config.features["/landing-page"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js",
    );
  });

  // Implements release-channel-deployments Task 3.3: no-channel byte-equivalence test
  it("should produce same output when no channel vs channel=undefined", async () => {
    const configWithoutChannel = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://example.com",
      gitHash: "abc123",
    });

    const configWithUndefinedChannel = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://example.com",
      gitHash: "abc123",
      channel: undefined,
    });

    expect(configWithoutChannel).toEqual(configWithUndefinedChannel);
  });

  // Implements release-channel-deployments Task 3.3: schema validation test
  it("should produce valid schema structure with channel config", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const config = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://example.com",
      channel: "release-4.10",
    });

    // Schema validation
    expect(config.$schema).toBeDefined();
    expect(config.schemaVersion).toBe("2.0.0");
    expect(config.chrome).toBeDefined();
    expect(config.features).toBeDefined();

    // All features should have required properties
    for (const route in config.features) {
      const feature = config.features[route];
      expect(feature.mfe).toBeDefined();
      expect(feature.entryUrl).toBeDefined();
      expect(feature.scope).toBeDefined();
      expect(feature.basePath).toBeDefined();
      expect(typeof feature.requiresAuth).toBe("boolean");
      expect(Array.isArray(feature.requiredRoles)).toBe(true);
      expect(typeof feature.enabled).toBe("boolean");
    }
  });

  it("should validate generated config against schema", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const config = await generateConfig(mockMfes, {
      environment: "production",
      baseUrl: "https://example.com",
      channel: "release-4.10",
    });

    // If validation fails, generateConfig throws - so if we get here, validation passed
    expect(config).toBeDefined();
  });
});
