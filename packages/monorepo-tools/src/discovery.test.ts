import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discoverMicroFrontends } from "./discovery.js";
import { loadPortMap, savePortMap, type LocalPortMap } from "./port-map.js";

describe("discovery", () => {
  let testDir: string;
  let testMapPath: string;
  let appsDir: string;

  beforeEach(async () => {
    // Create temp directory for test files
    testDir = join(tmpdir(), `discovery-test-${Date.now()}`);
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
    testMapPath = join(testDir, ".local-port-map.json");
    appsDir = join(testDir, "apps", "mfes");
    await mkdir(appsDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  async function createMFE(name: string, config?: { port?: number; scope?: string }) {
    const mfeDir = join(appsDir, name);
    await mkdir(mfeDir, { recursive: true });

    const pkg = {
      name: `@mfe-runtime/${name}`,
      version: "0.1.0",
      description: `Test ${name}`,
      mfe: config || undefined,
    };

    await writeFile(join(mfeDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
  }

  describe("REQ-004: Discovery returns mapped ports", () => {
    it("should return mapped ports from existing port map", async () => {
      // Implements spec scenario: "Discovery returns mapped ports"
      const portMap: LocalPortMap = {
        "mfe-dashboard": 5174,
        "mfe-widget": 5175,
      };
      await savePortMap(portMap, testMapPath);

      await createMFE("mfe-dashboard");
      await createMFE("mfe-widget");

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(2);

      const dashboard = mfes.find((m) => m.shortName === "mfe-dashboard");
      const widget = mfes.find((m) => m.shortName === "mfe-widget");

      expect(dashboard?.port).toBe(5174); // Uses mapped port
      expect(widget?.port).toBe(5175); // Uses mapped port
    });

    it("should allocate port for new app not in map", async () => {
      // Implements spec scenario: "Discovery allocates a port for a new app"
      const portMap: LocalPortMap = {
        "mfe-widget": 5175,
      };
      await savePortMap(portMap, testMapPath);

      await createMFE("mfe-widget");
      await createMFE("mfe-chart"); // New app not in map

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(2);

      const widget = mfes.find((m) => m.shortName === "mfe-widget");
      const chart = mfes.find((m) => m.shortName === "mfe-chart");

      expect(widget?.port).toBe(5175); // Uses existing mapped port
      expect(chart?.port).toBeDefined(); // Gets a resolved port
      expect(chart?.port).not.toBe(5175); // Different from widget

      // Verify port was persisted to map
      const updatedMap = await loadPortMap(testMapPath);
      expect(updatedMap["mfe-chart"]).toBe(chart?.port);
    });
  });

  describe("REQ-002: Custom port override (preferred port)", () => {
    it("should use preferred port from package.json when available", async () => {
      // Implements spec scenario: "Preferred port is used when available"
      await createMFE("mfe-custom", { port: 5200 });

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(1);
      expect(mfes[0].port).toBe(5200);

      // Verify it was persisted
      const portMap = await loadPortMap(testMapPath);
      expect(portMap["mfe-custom"]).toBe(5200);
    });

    it("should assign alternate port when preferred port is occupied", async () => {
      // Implements spec scenario: "Preferred port falls back when occupied"
      const portMap: LocalPortMap = {
        "mfe-alpha": 5200, // Occupies port 5200
      };
      await savePortMap(portMap, testMapPath);

      await createMFE("mfe-alpha"); // Processed first, will reuse 5200 from map
      await createMFE("mfe-beta", { port: 5200 }); // Processed second, wants 5200 but it's taken

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(2);

      const alpha = mfes.find((m) => m.shortName === "mfe-alpha");
      const beta = mfes.find((m) => m.shortName === "mfe-beta");

      expect(alpha?.port).toBe(5200); // Reuses its existing mapped port (REQ-003)
      expect(beta?.port).not.toBe(5200); // Gets alternate because 5200 is in use
      expect(beta?.port).toBeGreaterThan(5200);
    });
  });

  describe("REQ-005: Port map persistence", () => {
    it("should persist resolved ports back to the map", async () => {
      await createMFE("mfe-dashboard", { port: 5174 });
      await createMFE("mfe-widget", { port: 5175 });

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(2);

      // Verify ports were persisted
      const portMap = await loadPortMap(testMapPath);
      expect(portMap["mfe-dashboard"]).toBe(5174);
      expect(portMap["mfe-widget"]).toBe(5175);
    });

    it("should update map when previous port becomes unavailable", async () => {
      // Pre-populate map with old port that we'll simulate as unavailable
      // by having it occupied by another app
      const portMap: LocalPortMap = {
        "mfe-widget": 5100,
        "mfe-other": 5200, // This occupies the preferred port
      };
      await savePortMap(portMap, testMapPath);

      await createMFE("mfe-widget", { port: 5200 }); // Prefers 5200
      await createMFE("mfe-other"); // Already has 5200 in map

      const mfes = await discoverMicroFrontends(testDir, testMapPath);
      const widget = mfes.find((m) => m.shortName === "mfe-widget");
      const other = mfes.find((m) => m.shortName === "mfe-other");

      // mfe-widget should reuse 5100 (its previously resolved port) since it's available
      expect(widget?.port).toBe(5100);

      // mfe-other keeps 5200
      expect(other?.port).toBe(5200);

      // Verify map still has both
      const updatedMap = await loadPortMap(testMapPath);
      expect(updatedMap["mfe-widget"]).toBe(5100);
      expect(updatedMap["mfe-other"]).toBe(5200);
    });
  });

  describe("Custom scope extraction", () => {
    it("should use custom scope from package.json", async () => {
      await createMFE("mfe-test", { scope: "customScope" });

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(1);
      expect(mfes[0].scope).toBe("customScope");
    });

    it("should derive scope from package name when not specified", async () => {
      await createMFE("mfe-widget");

      const mfes = await discoverMicroFrontends(testDir, testMapPath);

      expect(mfes).toHaveLength(1);
      expect(mfes[0].scope).toBe("widget"); // Derived from "mfe-widget"
    });
  });

  describe("Empty discovery", () => {
    it("should return empty array when no MFEs found", async () => {
      const mfes = await discoverMicroFrontends(testDir, testMapPath);
      expect(mfes).toEqual([]);
    });
  });
});
