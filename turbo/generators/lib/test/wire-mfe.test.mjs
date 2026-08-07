import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { wireToShellConfigs, wireToCleanupWorkflow } from "../wire-mfe.mjs";

const TEST_DIR = join(process.cwd(), "turbo/generators/lib/test/fixtures");

describe("wireToShellConfigs", () => {
  beforeEach(() => {
    // Create test fixture structure
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(join(TEST_DIR, "apps/shells/test-shell/public"), { recursive: true });
    mkdirSync(join(TEST_DIR, "packages/remote-config"), { recursive: true });

    // Create minimal schema
    const schema = {
      type: "object",
      properties: {
        schemaVersion: { type: "string" },
        chrome: { type: "object" },
        features: { type: "object" }
      },
      required: ["schemaVersion", "chrome", "features"]
    };
    writeFileSync(
      join(TEST_DIR, "packages/remote-config/schema.json"),
      JSON.stringify(schema, null, 2)
    );

    // Create minimal config files
    const baseConfig = {
      $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
      schemaVersion: "2.0.0",
      chrome: {},
      features: {}
    };
    writeFileSync(
      join(TEST_DIR, "apps/shells/test-shell/public/remotes.config.dev.json"),
      JSON.stringify(baseConfig, null, 2)
    );
    writeFileSync(
      join(TEST_DIR, "apps/shells/test-shell/public/remotes.config.prod.json"),
      JSON.stringify(baseConfig, null, 2)
    );

    // Change to test directory
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    // Change back and cleanup
    process.chdir(join(TEST_DIR, "../../../../../"));
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should add MFE entry to dev config with correct shape", () => {
    const files = wireToShellConfigs("mfe-orders", "orders", "/orders", 5177);

    expect(files).toHaveLength(2);

    const devConfig = JSON.parse(
      readFileSync("apps/shells/test-shell/public/remotes.config.dev.json", "utf-8")
    );

    expect(devConfig.features["/orders"]).toEqual({
      mfe: "mfe-orders",
      entryUrl: "http://localhost:5177/remoteEntry.js",
      scope: "orders",
      version: "0.0.0",
      basePath: "/orders",
      requiresAuth: false,
      requiredRoles: [],
      enabled: true
    });
  });

  it("should add MFE entry to prod config with blob URL pattern", () => {
    wireToShellConfigs("mfe-orders", "orders", "/orders", 5177, "1.0.0");

    const prodConfig = JSON.parse(
      readFileSync("apps/shells/test-shell/public/remotes.config.prod.json", "utf-8")
    );

    expect(prodConfig.features["/orders"].entryUrl).toBe(
      "https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-orders/v1.0.0/remoteEntry.js"
    );
  });

  it("should validate patched config against schema", () => {
    // Should not throw if valid
    expect(() => {
      wireToShellConfigs("mfe-orders", "orders", "/orders", 5177);
    }).not.toThrow();
  });

  it("should return empty array if no shells exist", () => {
    rmSync("apps/shells", { recursive: true, force: true });
    const files = wireToShellConfigs("mfe-orders", "orders", "/orders", 5177);
    expect(files).toEqual([]);
  });
});

describe("wireToCleanupWorkflow", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(join(TEST_DIR, ".github/workflows"), { recursive: true });
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(join(TEST_DIR, "../../../../../../"));
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should add MFE to fallback list", () => {
    const workflow = `
name: Cleanup
jobs:
  cleanup:
    steps:
      - name: Delete MFEs
        run: |
          if [ -z "$MFES" ]; then
            # scaffold:mfe-list:start
            MFES="mfe-widget"
            # scaffold:mfe-list:end
          fi
`;
    writeFileSync(".github/workflows/cleanup-previews.yml", workflow);

    wireToCleanupWorkflow("mfe-orders");

    const updated = readFileSync(".github/workflows/cleanup-previews.yml", "utf-8");
    expect(updated).toContain('MFES="mfe-orders mfe-widget"');
  });

  it("should be idempotent (no duplicates)", () => {
    const workflow = `
name: Cleanup
jobs:
  cleanup:
    steps:
      - name: Delete MFEs
        run: |
          if [ -z "$MFES" ]; then
            # scaffold:mfe-list:start
            MFES="mfe-widget"
            # scaffold:mfe-list:end
          fi
`;
    writeFileSync(".github/workflows/cleanup-previews.yml", workflow);

    wireToCleanupWorkflow("mfe-orders");
    wireToCleanupWorkflow("mfe-orders"); // Run twice

    const updated = readFileSync(".github/workflows/cleanup-previews.yml", "utf-8");
    const match = updated.match(/MFES="([^"]*)"/);
    const list = match[1].split(/\s+/);
    
    expect(list.filter(mfe => mfe === "mfe-orders")).toHaveLength(1);
  });

  it("should keep list alphabetically sorted", () => {
    const workflow = `
name: Cleanup
jobs:
  cleanup:
    steps:
      - name: Delete MFEs
        run: |
          if [ -z "$MFES" ]; then
            # scaffold:mfe-list:start
            MFES="mfe-aaa mfe-zzz"
            # scaffold:mfe-list:end
          fi
`;
    writeFileSync(".github/workflows/cleanup-previews.yml", workflow);

    wireToCleanupWorkflow("mfe-mmm");

    const updated = readFileSync(".github/workflows/cleanup-previews.yml", "utf-8");
    expect(updated).toContain('MFES="mfe-aaa mfe-mmm mfe-zzz"');
  });

  it("should throw error if markers are missing", () => {
    const workflow = `
name: Cleanup
jobs:
  cleanup:
    steps:
      - name: Delete MFEs
        run: |
          MFES="mfe-widget"
`;
    writeFileSync(".github/workflows/cleanup-previews.yml", workflow);

    expect(() => {
      wireToCleanupWorkflow("mfe-orders");
    }).toThrow(/Missing markers/);
  });
});
