/**
 * Test to verify app-config schema is available for copy into dist.
 * Covers: AAR-2 (Schema.json bundled into shell dist)
 */

import { describe, it, expect } from "vite-plus/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

describe("app-config schema availability", () => {
  it("schema.json exists in the app-config package", () => {
    const schemaPath = resolve(__dirname, "../../../../../packages/app-config/schema.json");

    expect(existsSync(schemaPath)).toBe(true);
  });
});
