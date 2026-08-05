// Implements PPD-2: Preview shell config generation tests
// See: openspec/changes/dev-preview-deployments/specs/pr-preview-deployments/spec.md

import { describe, it, expect } from "vite-plus/test";
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
  it("should rewrite entryUrl for changed MFE to pr-<n> URL", () => {
    const result = generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js",
    );
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js",
    );
  });

  it("should keep dev/ URL for untouched MFEs", () => {
    const result = generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.features["/"].entryUrl).toContain("/dev/remoteEntry.js");
  });

  it("should return config equal to dev config when zero MFEs changed", () => {
    const result = generatePreviewConfig(baseConfig, [], 42);

    expect(result).toEqual(baseConfig);
  });

  it("should handle multiple changed MFEs", () => {
    const result = generatePreviewConfig(baseConfig, ["mfe-widget", "mfe-landing-page"], 99);

    expect(result.features["/widget"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-99/remoteEntry.js",
    );
    expect(result.features["/"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/pr-99/remoteEntry.js",
    );
  });

  it("should preserve all other config properties", () => {
    const result = generatePreviewConfig(baseConfig, ["mfe-widget"], 42);

    expect(result.$schema).toBe(baseConfig.$schema);
    expect(result.schemaVersion).toBe(baseConfig.schemaVersion);
    expect(result.chrome).toEqual(baseConfig.chrome);
    expect(result.features["/widget"].scope).toBe("widget");
    expect(result.features["/widget"].basePath).toBe("/widget");
    expect(result.features["/widget"].requiresAuth).toBe(false);
  });
});
