import { describe, it, expect } from "vite-plus/test";
import { validateManifest } from "../../../scripts/validate-manifest.js";
import type { MicroFrontendManifest } from "../../../types/manifest.js";

describe("Manifest Schema Validation", () => {
  const validManifest: MicroFrontendManifest = {
    version: "1.0.0",
    timestamp: "2026-07-17T10:00:00Z",
    environment: "production",
    microfrontends: {
      "mfe-widget": {
        version: "1.2.3",
        url: "https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js",
        integrity: "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC",
        scope: "widget",
        module: "./App",
      },
    },
  };

  describe("Valid manifests", () => {
    it("should validate a minimal valid manifest", () => {
      const result = validateManifest(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept manifest with multiple MFEs", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": validManifest.microfrontends["mfe-widget"],
          "mfe-dashboard": {
            version: "2.0.0",
            url: "https://cdn.example.com/mfe-dashboard/2.0.0/remoteEntry.js",
            scope: "dashboard",
            module: "./Dashboard",
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept prerelease versions", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            version: "1.2.3-beta.1",
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept manifest with metadata", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            metadata: {
              buildHash: "a1b2c3d",
              buildDate: "2026-07-17T09:55:00Z",
              changelog: "https://github.com/org/repo/releases/tag/v1.2.3",
            },
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(true);
    });

    it("should accept all environment values", () => {
      const environments: Array<"development" | "staging" | "production"> = [
        "development",
        "staging",
        "production",
      ];

      environments.forEach((env) => {
        const manifest = { ...validManifest, environment: env };
        const result = validateManifest(manifest);
        expect(result.valid).toBe(true);
      });
    });

    it("should accept different SRI hash algorithms", () => {
      const hashes = [
        "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
        "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC",
        "sha512-vSsar3708Jvp9Szi2NWZZ02Mb2D8Ya9NUqzDTqV+nSAZ7V0G5v+4V0H6q/lFXy9NwNwYiNT5x5/fYOcTQVGQ==",
      ];

      hashes.forEach((integrity) => {
        const manifest = {
          ...validManifest,
          microfrontends: {
            "mfe-widget": {
              ...validManifest.microfrontends["mfe-widget"],
              integrity,
            },
          },
        };
        const result = validateManifest(manifest);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe("Invalid manifests", () => {
    it("should reject non-object values", () => {
      const result = validateManifest(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Manifest must be an object");
    });

    it("should reject missing version", () => {
      const manifest = { ...validManifest };
      delete (manifest as Partial<MicroFrontendManifest>).version;
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("should reject invalid version format", () => {
      const manifest = { ...validManifest, version: "invalid" };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("should reject missing timestamp", () => {
      const manifest = { ...validManifest };
      delete (manifest as Partial<MicroFrontendManifest>).timestamp;
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("timestamp"))).toBe(true);
    });

    it("should reject invalid environment", () => {
      const manifest = { ...validManifest, environment: "invalid" as never };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("environment"))).toBe(true);
    });

    it("should reject missing microfrontends", () => {
      const manifest = { ...validManifest };
      delete (manifest as Partial<MicroFrontendManifest>).microfrontends;
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("microfrontends"))).toBe(true);
    });

    it("should reject invalid MFE name pattern", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          InvalidName: validManifest.microfrontends["mfe-widget"],
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("name must match pattern"))).toBe(true);
    });

    it("should reject invalid MFE version", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            version: "invalid",
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    });

    it("should reject missing MFE url", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            url: undefined as never,
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("url"))).toBe(true);
    });

    it("should reject invalid integrity hash format", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            integrity: "invalid-hash",
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("integrity"))).toBe(true);
    });

    it("should reject missing MFE scope", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            scope: undefined as never,
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("scope"))).toBe(true);
    });

    it("should reject invalid MFE module format", () => {
      const manifest = {
        ...validManifest,
        microfrontends: {
          "mfe-widget": {
            ...validManifest.microfrontends["mfe-widget"],
            module: "App", // Missing "./" prefix
          },
        },
      };
      const result = validateManifest(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("module"))).toBe(true);
    });
  });
});
