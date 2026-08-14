// Implements CG-1: environment mode 'local' replaces 'development', old name rejected with guidance
// See openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md

import { describe, it, expect } from "vite-plus/test";
import { generateConfig } from "./config-generator.js";
import type { MicroFrontend } from "./types.js";

describe("config-generator", () => {
  const mockMFE: MicroFrontend = {
    name: "mfe-widget",
    shortName: "mfe-widget",
    scope: "widget",
    port: 5174,
    version: "1.0.0",
    path: "/apps/mfes/mfe-widget",
  };

  describe("environment modes (CG-1)", () => {
    it("should generate localhost URLs for 'local' environment", async () => {
      // Scenario: Local URLs use localhost
      // WHEN environment is "local" and MicroFrontend has port 5174
      // THEN entryUrl is `http://localhost:5174/remoteEntry.js`
      const config = await generateConfig([mockMFE], {
        environment: "local",
      });

      const featureEntry = Object.values(config.features || {})[0];
      expect(featureEntry).toBeDefined();
      expect(featureEntry?.entryUrl).toBe("http://localhost:5174/remoteEntry.js");
    });

    it("should throw error for 'development' environment with guidance message", async () => {
      // Scenario: Development URLs use localhost
      // WHEN environment is "development" and MicroFrontend has port 5174
      // THEN generateConfig throws an error (mode superseded)
      // AND the error message states that the mode was renamed to "local"

      await expect(
        generateConfig([mockMFE], {
          environment: "development",
        }),
      ).rejects.toThrow(/renamed to "local"/i);
    });

    it("should generate versioned production URLs with git hash", async () => {
      // Scenario: Production URLs use base URL and versioning
      // WHEN environment is "production" with baseUrl "https://cdn.example.com" and gitHash "abc123"
      // THEN entryUrl is `https://cdn.example.com/mfe-{name}/vabc123/remoteEntry.js`

      const config = await generateConfig([mockMFE], {
        environment: "production",
        baseUrl: "https://cdn.example.com",
        gitHash: "abc123",
      });

      const featureEntry = Object.values(config.features || {})[0];
      expect(featureEntry).toBeDefined();
      expect(featureEntry?.entryUrl).toBe(
        "https://cdn.example.com/mfe-mfe-widget/vabc123/remoteEntry.js",
      );
    });

    it("should use 'latest' version when no git hash provided", async () => {
      // Scenario: Production defaults to latest when no git hash
      // WHEN environment is "production" without gitHash
      // THEN entryUrl includes `/vlatest/`

      const config = await generateConfig([mockMFE], {
        environment: "production",
        baseUrl: "https://cdn.example.com",
      });

      const featureEntry = Object.values(config.features || {})[0];
      expect(featureEntry).toBeDefined();
      expect(featureEntry?.entryUrl).toBe(
        "https://cdn.example.com/mfe-mfe-widget/vlatest/remoteEntry.js",
      );
    });
  });

  describe("root MFE designation (CG-2)", () => {
    const mockLandingPage: MicroFrontend = {
      name: "mfe-landing-page",
      shortName: "mfe-landing-page",
      scope: "landingPage",
      port: 5175,
      version: "1.0.0",
      path: "/apps/mfes/mfe-landing-page",
    };

    it("should map designated root MFE to '/' route", async () => {
      // Scenario: Designated root MFE maps to "/"
      // WHEN generateConfig runs with rootMfe "mfe-landing-page" and MFEs "mfe-landing-page" and "mfe-widget"
      // THEN the generated config maps route "/" to mfe-landing-page
      // AND maps route "/widget" to mfe-widget
      // AND no route key "/landing-page" exists

      const config = await generateConfig([mockLandingPage, mockMFE], {
        environment: "local",
        rootMfe: "mfe-landing-page",
      });

      expect(config.features).toBeDefined();
      expect(config.features?.["/"]?.mfe).toBe("mfe-landing-page");
      expect(config.features?.["/widget"]?.mfe).toBe("mfe-widget");
      expect(config.features?.["/landing-page"]).toBeUndefined();
    });

    it("should throw error for unknown root MFE designation", async () => {
      // Scenario: Unknown root MFE designation fails
      // WHEN generateConfig runs with rootMfe "mfe-missing" and no discovered MFE named "mfe-missing"
      // THEN it throws an error naming the unknown MFE

      await expect(
        generateConfig([mockMFE], {
          environment: "local",
          rootMfe: "mfe-missing",
        }),
      ).rejects.toThrow(/mfe-missing/i);
    });

    it("should use default basePaths when no root MFE designated", async () => {
      // When no rootMfe is designated, all MFEs use their default base paths
      const config = await generateConfig([mockLandingPage, mockMFE], {
        environment: "local",
      });

      expect(config.features).toBeDefined();
      expect(config.features?.["/landing-page"]?.mfe).toBe("mfe-landing-page");
      expect(config.features?.["/widget"]?.mfe).toBe("mfe-widget");
      expect(config.features?.["/"]).toBeUndefined();
    });
  });
});
