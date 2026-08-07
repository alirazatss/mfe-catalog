// Implements PPD-2: Preview shell config generation tests
// Implements release-channel-deployments Task 3.3: channel URL tests
// See: openspec/changes/dev-preview-deployments/specs/pr-preview-deployments/spec.md
// See: openspec/changes/release-channel-deployments/specs/config-generation/spec.md

import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { generatePreviewConfig } from "./generate-preview-config.js";

const baseConfig = {
  $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
  schemaVersion: "2.0.0" as const,
  chrome: {},
  features: {
    "/": {
      mfe: "mfe-landing-page",
      entryUrl:
        "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js",
      scope: "landingPage",
      version: "0.0.0",
      basePath: "/",
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    },
    "/widget": {
      mfe: "mfe-widget",
      entryUrl:
        "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/dev/remoteEntry.js",
      scope: "widget",
      version: "0.0.0",
      basePath: "/widget",
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    },
  },
};

describe("generatePreviewConfig", () => {
  // Mock fetch for blob existence checks
  const mockFetch = vi.fn();
  beforeEach(() => {
    global.fetch = mockFetch as any;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should rewrite entryUrl for changed MFE to pr-<n> URL", async () => {
    const result = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js",
    );
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js",
    );
  });

  it("should keep dev/ URL for untouched MFEs", async () => {
    const result = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.features["/"].entryUrl).toContain("/dev/remoteEntry.js");
  });

  it("should return config equal to dev config when zero MFEs changed", async () => {
    const result = await generatePreviewConfig(baseConfig, [], 42);

    expect(result).toEqual(baseConfig);
  });

  it("should handle multiple changed MFEs", async () => {
    const result = await generatePreviewConfig(baseConfig, ["mfe-widget", "mfe-landing-page"], 99);

    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-99/remoteEntry.js",
    );
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/pr-99/remoteEntry.js",
    );
  });

  it("should preserve all other config properties", async () => {
    const result = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.$schema).toBe(baseConfig.$schema);
    expect(result.schemaVersion).toBe(baseConfig.schemaVersion);
    expect(result.chrome).toEqual(baseConfig.chrome);
    expect(result.features["/widget"].scope).toBe("widget");
    expect(result.features["/widget"].basePath).toBe("/widget");
    expect(result.features["/widget"].requiresAuth).toBe(false);
  });

  // Implements release-channel-deployments Task 3.3: channel URL emission test
  it("should use base-channel URL for unchanged MFEs when channel build exists", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42, "release-4.10");

    // Changed MFE still uses pr-<n> URL
    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js",
    );

    // Unchanged MFE uses base-channel URL
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/release-4.10/remoteEntry.js",
    );

    // Verify fetch was called to check blob existence
    expect(mockFetch).toHaveBeenCalledWith(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/release-4.10/remoteEntry.js",
      { method: "HEAD" },
    );
  });

  // Implements release-channel-deployments Task 3.3: dev fallback test
  it("should fallback to dev/ URL when base-channel build does not exist", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42, "release-4.10");

    // Changed MFE uses pr-<n> URL
    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js",
    );

    // Unchanged MFE falls back to dev URL
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js",
    );
  });

  // Implements release-channel-deployments Task 3.3: no-channel byte-equivalence test
  it("should produce byte-equivalent output when no base-channel provided", async () => {
    const resultWithoutChannel = await generatePreviewConfig(baseConfig, ["mfe-widget"], 42);
    const resultWithUndefinedChannel = await generatePreviewConfig(
      baseConfig,
      ["mfe-widget"],
      42,
      undefined,
    );

    expect(resultWithoutChannel).toEqual(resultWithUndefinedChannel);
  });

  // Implements release-channel-deployments Task 3.3: schema validation test
  it("should produce valid config schema when using base-channel", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await generatePreviewConfig(baseConfig, [], 42, "release-4.10");

    // Schema structure should be preserved
    expect(result.$schema).toBeDefined();
    expect(result.schemaVersion).toBe("2.0.0");
    expect(result.chrome).toBeDefined();
    expect(result.features).toBeDefined();

    // All features should have required properties
    for (const route in result.features) {
      const feature = result.features[route];
      expect(feature.mfe).toBeDefined();
      expect(feature.entryUrl).toBeDefined();
      expect(feature.scope).toBeDefined();
      expect(feature.basePath).toBeDefined();
      expect(typeof feature.requiresAuth).toBe("boolean");
      expect(Array.isArray(feature.requiredRoles)).toBe(true);
      expect(typeof feature.enabled).toBe("boolean");
    }
  });
});
