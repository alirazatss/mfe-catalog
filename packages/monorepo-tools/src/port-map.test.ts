import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadPortMap,
  savePortMap,
  resolvePort,
  batchResolvePort,
  isPortAvailable,
  findAvailablePort,
  type LocalPortMap,
} from "./port-map.js";

describe("port-map", () => {
  let testDir: string;
  let testMapPath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    testDir = join(tmpdir(), `port-map-test-${Date.now()}`);
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }
    testMapPath = join(testDir, ".local-port-map.json");
  });

  afterEach(async () => {
    // Clean up test file
    if (existsSync(testMapPath)) {
      await unlink(testMapPath);
    }
  });

  describe("loadPortMap", () => {
    it("should return empty object when file doesn't exist", async () => {
      const portMap = await loadPortMap(testMapPath);
      expect(portMap).toEqual({});
    });

    it("should load valid port map from file", async () => {
      const testData = {
        "mfe-widget": 5174,
        "mfe-dashboard": 5175,
      };
      await writeFile(testMapPath, JSON.stringify(testData), "utf-8");

      const portMap = await loadPortMap(testMapPath);
      expect(portMap).toEqual(testData);
    });

    it("should throw error for invalid JSON", async () => {
      await writeFile(testMapPath, "not valid json", "utf-8");

      await expect(loadPortMap(testMapPath)).rejects.toThrow("Failed to parse local port map");
    });

    it("should throw error for non-object content", async () => {
      await writeFile(testMapPath, JSON.stringify([1, 2, 3]), "utf-8");

      await expect(loadPortMap(testMapPath)).rejects.toThrow("Invalid port map: expected object");
    });

    it("should throw error for invalid entry types", async () => {
      const invalidData = {
        "mfe-widget": "not a number",
      };
      await writeFile(testMapPath, JSON.stringify(invalidData), "utf-8");

      await expect(loadPortMap(testMapPath)).rejects.toThrow("Invalid port map entry");
    });
  });

  describe("savePortMap", () => {
    it("should save port map to file", async () => {
      const testData: LocalPortMap = {
        "mfe-widget": 5174,
        "mfe-dashboard": 5175,
      };

      await savePortMap(testData, testMapPath);

      expect(existsSync(testMapPath)).toBe(true);
      const loaded = await loadPortMap(testMapPath);
      expect(loaded).toEqual(testData);
    });

    it("should create directory if it doesn't exist", async () => {
      const nestedPath = join(testDir, "nested", "dir", ".local-port-map.json");
      const testData: LocalPortMap = { "mfe-test": 5200 };

      await savePortMap(testData, nestedPath);

      expect(existsSync(nestedPath)).toBe(true);
      const loaded = await loadPortMap(nestedPath);
      expect(loaded).toEqual(testData);
    });
  });

  describe("isPortAvailable", () => {
    it("should return true for an available port", async () => {
      // Use high port number unlikely to be in use
      const available = await isPortAvailable(59999);
      expect(available).toBe(true);
    });

    it("should return false for a port in use", async () => {
      // Most systems have something listening on 22 (SSH) or we can assume common ports are taken
      // This test may be flaky depending on environment, so we'll test the mechanism instead
      const net = await import("node:net");
      const server = net.createServer();

      await new Promise<void>((resolve) => {
        server.listen(58888, "127.0.0.1", () => resolve());
      });

      const available = await isPortAvailable(58888);
      expect(available).toBe(false);

      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    });
  });

  describe("findAvailablePort", () => {
    it("should find an available port in range", async () => {
      const port = await findAvailablePort(59000, 59100);
      expect(port).toBeGreaterThanOrEqual(59000);
      expect(port).toBeLessThanOrEqual(59100);
    });

    it("should skip ports in usedPorts set", async () => {
      const usedPorts = new Set([59000, 59001, 59002]);
      const port = await findAvailablePort(59000, 59100, usedPorts);

      expect(port).toBeGreaterThan(59002);
      expect(usedPorts.has(port)).toBe(false);
    });

    it("should throw error when no port available in range", async () => {
      // Create a set with all ports in a small range
      const usedPorts = new Set<number>();
      for (let i = 59900; i <= 59910; i++) {
        usedPorts.add(i);
      }

      await expect(findAvailablePort(59900, 59910, usedPorts)).rejects.toThrow(
        "No available port found in range",
      );
    });
  });

  describe("resolvePort - REQ-003: stable port reuse", () => {
    it("should reuse previously resolved port when available", async () => {
      // Implements spec scenario: "Restart reuses the same free port"
      const portMap: LocalPortMap = {
        "mfe-landing-page": 5175,
      };
      const usedPorts = new Set<number>();

      const result = await resolvePort("mfe-landing-page", 5174, portMap, usedPorts);

      expect(result.port).toBe(5175); // Reuses previously resolved port
      expect(result.isNew).toBe(false);
      expect(result.changed).toBe(false);
      expect(portMap["mfe-landing-page"]).toBe(5175);
      expect(usedPorts.has(5175)).toBe(true);
    });

    it("should assign alternate port when previously resolved port is unavailable", async () => {
      // Implements spec scenario: "Previously resolved port becomes unavailable"
      const portMap: LocalPortMap = {
        "mfe-landing-page": 22, // SSH port, definitely not available
      };
      const usedPorts = new Set<number>();

      const result = await resolvePort("mfe-landing-page", 5175, portMap, usedPorts);

      expect(result.port).not.toBe(22); // Should not use unavailable port
      expect(result.isNew).toBe(false); // Not new, but changed
      expect(result.changed).toBe(true);
      expect(portMap["mfe-landing-page"]).toBe(result.port);
    });
  });

  describe("resolvePort - REQ-002: preferred port resolution", () => {
    it("should use preferred port when available", async () => {
      // Implements spec scenario: "Preferred port is available"
      const portMap: LocalPortMap = {};
      const usedPorts = new Set<number>();

      const result = await resolvePort("mfe-widget", 5174, portMap, usedPorts);

      expect(result.port).toBe(5174); // Uses preferred port
      expect(result.isNew).toBe(true);
      expect(result.changed).toBe(false);
      expect(portMap["mfe-widget"]).toBe(5174);
    });

    it("should assign alternate port when preferred port is in usedPorts", async () => {
      // Implements spec scenario: "Preferred port is already in use"
      const portMap: LocalPortMap = {};
      const usedPorts = new Set([5174]); // Port already allocated

      const result = await resolvePort("mfe-widget", 5174, portMap, usedPorts);

      expect(result.port).not.toBe(5174); // Should assign alternate
      expect(result.port).toBeGreaterThan(5174);
      expect(result.isNew).toBe(true);
      expect(portMap["mfe-widget"]).toBe(result.port);
    });
  });

  describe("resolvePort - REQ-001: new app assignment", () => {
    it("should assign port to new app not in map", async () => {
      // Implements spec scenario: "New app is assigned a resolved port"
      const portMap: LocalPortMap = {};
      const usedPorts = new Set<number>();

      const result = await resolvePort("mfe-new-app", 5180, portMap, usedPorts);

      expect(result.port).toBe(5180);
      expect(result.isNew).toBe(true);
      expect(result.changed).toBe(false);
      expect(portMap["mfe-new-app"]).toBe(5180);
    });
  });

  describe("batchResolvePort", () => {
    it("should resolve ports for multiple apps without conflicts", async () => {
      const portMap: LocalPortMap = {};
      const apps = [
        { appName: "mfe-widget", preferredPort: 5174 },
        { appName: "mfe-dashboard", preferredPort: 5175 },
        { appName: "mfe-landing", preferredPort: 5176 },
      ];

      const results = await batchResolvePort(apps, portMap);

      expect(results.size).toBe(3);
      expect(results.get("mfe-widget")?.port).toBe(5174);
      expect(results.get("mfe-dashboard")?.port).toBe(5175);
      expect(results.get("mfe-landing")?.port).toBe(5176);

      // Ensure no duplicate assignments
      const ports = Array.from(results.values()).map((r) => r.port);
      const uniquePorts = new Set(ports);
      expect(uniquePorts.size).toBe(ports.length);
    });

    it("should handle conflicting preferred ports", async () => {
      const portMap: LocalPortMap = {};
      const apps = [
        { appName: "mfe-widget", preferredPort: 5174 },
        { appName: "mfe-dashboard", preferredPort: 5174 }, // Same preferred port
      ];

      const results = await batchResolvePort(apps, portMap);

      const widget = results.get("mfe-widget");
      const dashboard = results.get("mfe-dashboard");

      expect(widget?.port).toBe(5174); // First gets preferred
      expect(dashboard?.port).not.toBe(5174); // Second gets alternate
      expect(widget?.port).not.toBe(dashboard?.port); // No duplicates
    });

    it("should respect existing port map entries", async () => {
      const portMap: LocalPortMap = {
        "mfe-widget": 5200, // Pre-existing assignment
      };
      const apps = [
        { appName: "mfe-widget", preferredPort: 5174 },
        { appName: "mfe-dashboard", preferredPort: 5175 },
      ];

      const results = await batchResolvePort(apps, portMap);

      // mfe-widget should reuse its existing port if available
      const widget = results.get("mfe-widget");
      expect(widget?.port).toBe(5200);
      expect(widget?.isNew).toBe(false);
    });
  });
});
