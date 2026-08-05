/**
 * Validation test for public/app-config.json.
 *
 * Ensures the repo's dev config document is valid against the schema.
 * Covers: SBV-3 (served app config document is schema-valid)
 */

import { describe, it, expect } from "vite-plus/test";
import { parseAppConfig, schemaVersion } from "@mfe-runtime/app-config";
import publicConfig from "../../public/app-config.json";

describe("public/app-config.json", () => {
  it("is valid according to the schema", () => {
    const result = parseAppConfig(publicConfig);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(schemaVersion);
    }
  });

  it("contains all required fields", () => {
    expect(publicConfig).toHaveProperty("schemaVersion");
    expect(publicConfig).toHaveProperty("apiBaseUrl");
    expect(publicConfig).toHaveProperty("auth.keycloakUrl");
    expect(publicConfig).toHaveProperty("auth.realm");
    expect(publicConfig).toHaveProperty("auth.clientId");
  });
});
