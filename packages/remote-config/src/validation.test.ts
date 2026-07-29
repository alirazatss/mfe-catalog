import { describe, it, expect } from "vite-plus/test";
import { validateRemoteConfig, safeValidateRemoteConfig } from "./validation.js";
import type { RemoteConfig } from "./types.js";

describe("validateRemoteConfig - valid manifests", () => {
  it("should accept a valid manifest with chrome and features", () => {
    const validManifest: RemoteConfig = {
      schemaVersion: "2.0.0",
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header@1.0.0/remoteEntry.js",
          scope: "mfeHeader",
          version: "1.0.0",
        },
      },
      features: {
        "/widgets": {
          mfe: "mfe-widget",
          entryUrl: "https://cdn.example.com/mfe-widget@2.1.0/remoteEntry.js",
          scope: "mfeWidget",
          version: "2.1.0",
          basePath: "/widgets",
        },
      },
    };

    expect(validateRemoteConfig(validManifest)).toBe(true);
  });

  it("should accept a minimal valid manifest with only required fields", () => {
    const minimal: RemoteConfig = {
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    expect(validateRemoteConfig(minimal)).toBe(true);
  });

  it("should accept manifest with legacy remotes array", () => {
    const legacy: RemoteConfig = {
      remotes: [
        {
          name: "mfe-widget",
          entryUrl: "https://cdn.example.com/mfe-widget/remoteEntry.js",
          scope: "mfeWidget",
          version: "1.0.0",
        },
      ],
    };

    expect(validateRemoteConfig(legacy)).toBe(true);
  });

  it("should accept manifest with optional config and auth fields", () => {
    const withOptionalFields: RemoteConfig = {
      features: {
        "/dashboard": {
          mfe: "mfe-dashboard",
          entryUrl: "https://cdn.example.com/mfe-dashboard/remoteEntry.js",
          requiresAuth: true,
          requiredRoles: ["admin", "viewer"],
          config: {
            apiEndpoint: "https://api.example.com",
            theme: "dark",
          },
          enabled: true,
        },
      },
    };

    expect(validateRemoteConfig(withOptionalFields)).toBe(true);
  });

  it("should accept empty chrome and features objects", () => {
    const empty: RemoteConfig = {
      chrome: {},
      features: {},
    };

    expect(validateRemoteConfig(empty)).toBe(true);
  });
});

describe("validateRemoteConfig - invalid inputs", () => {
  it("should reject manifest with entryUrl containing spaces", () => {
    const nonUrl = {
      features: {
        "/widgets": {
          mfe: "mfe-widget",
          entryUrl: "not a url with spaces",
        },
      },
    };

    expect(() => validateRemoteConfig(nonUrl)).toThrow(/validation failed/);
  });

  it("should reject manifest missing required mfe field", () => {
    const missingMfe = {
      chrome: {
        header: {
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    expect(() => validateRemoteConfig(missingMfe)).toThrow(/validation failed/);
    expect(() => validateRemoteConfig(missingMfe)).toThrow(/mfe/);
  });

  it("should reject manifest missing required entryUrl field", () => {
    const missingEntryUrl = {
      chrome: {
        header: {
          mfe: "mfe-header",
        },
      },
    };

    expect(() => validateRemoteConfig(missingEntryUrl)).toThrow(/validation failed/);
    expect(() => validateRemoteConfig(missingEntryUrl)).toThrow(/entryUrl/);
  });

  it("should reject manifest with wrong types", () => {
    const wrongTypes = {
      chrome: {
        header: {
          mfe: 123, // should be string
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    expect(() => validateRemoteConfig(wrongTypes)).toThrow(/validation failed/);
  });

  it("should reject manifest with invalid mfe name pattern", () => {
    const invalidPattern = {
      chrome: {
        header: {
          mfe: "123-invalid", // must start with letter
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    expect(() => validateRemoteConfig(invalidPattern)).toThrow(/validation failed/);
  });

  it("should reject manifest with invalid scope pattern", () => {
    const invalidScope = {
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
          scope: "invalid-scope", // no hyphens allowed in scope
        },
      },
    };

    expect(() => validateRemoteConfig(invalidScope)).toThrow(/validation failed/);
  });

  it("should reject manifest with invalid basePath (missing leading slash)", () => {
    const invalidBasePath = {
      features: {
        "/widgets": {
          mfe: "mfe-widget",
          entryUrl: "https://cdn.example.com/mfe-widget/remoteEntry.js",
          basePath: "widgets", // must start with /
        },
      },
    };

    expect(() => validateRemoteConfig(invalidBasePath)).toThrow(/validation failed/);
  });

  it("should reject manifest with unknown top-level fields when strict", () => {
    const unknownFields = {
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
      unknownField: "should-not-be-here",
    };

    expect(() => validateRemoteConfig(unknownFields)).toThrow(/validation failed/);
    expect(() => validateRemoteConfig(unknownFields)).toThrow(/additional/);
  });

  it("should reject null input", () => {
    expect(() => validateRemoteConfig(null)).toThrow(/validation failed/);
  });

  it("should reject undefined input", () => {
    expect(() => validateRemoteConfig(undefined)).toThrow(/validation failed/);
  });

  it("should reject non-object input", () => {
    expect(() => validateRemoteConfig("not an object")).toThrow(/validation failed/);
    expect(() => validateRemoteConfig(123)).toThrow(/validation failed/);
    expect(() => validateRemoteConfig([])).toThrow(/validation failed/);
  });
});

describe("safeValidateRemoteConfig", () => {
  it("should return typed manifest for valid input", () => {
    const valid: RemoteConfig = {
      chrome: {
        header: {
          mfe: "mfe-header",
          entryUrl: "https://cdn.example.com/mfe-header/remoteEntry.js",
        },
      },
    };

    const result = safeValidateRemoteConfig(valid);
    expect(result).not.toBeNull();
    expect(result).toEqual(valid);
  });

  it("should return null for invalid input without throwing", () => {
    const invalid = {
      chrome: {
        header: {
          mfe: "mfe-header",
          // missing required entryUrl
        },
      },
    };

    const result = safeValidateRemoteConfig(invalid);
    expect(result).toBeNull();
  });

  it("should return null for malformed input", () => {
    expect(safeValidateRemoteConfig(null)).toBeNull();
    expect(safeValidateRemoteConfig(undefined)).toBeNull();
    expect(safeValidateRemoteConfig("string")).toBeNull();
    expect(safeValidateRemoteConfig(123)).toBeNull();
  });
});
