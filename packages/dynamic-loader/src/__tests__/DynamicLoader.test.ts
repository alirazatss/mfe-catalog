import { describe, it, expect, beforeEach, vi, afterEach } from "vite-plus/test";
import { DynamicLoader } from "../DynamicLoader.js";
import type { RemoteConfig } from "@mfe-runtime/remote-config";

describe("DynamicLoader manifest resolution", () => {
  let loader: DynamicLoader;

  beforeEach(() => {
    loader = new DynamicLoader();
  });

  describe("setConfig / resolveMFE", () => {
    it("resolves chrome MFEs", () => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "http://localhost:5175/remoteEntry.js",
            scope: "header",
          },
        },
      });

      const resolved = loader.resolveMFE("header");
      expect(resolved?.source).toBe("chrome");
      expect(resolved?.slot).toBe("header");
      expect(resolved?.scope).toBe("header");
    });

    it("resolves feature MFEs with defaults", () => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        features: {
          "/widget": {
            mfe: "widget",
            entryUrl: "http://localhost:5174/remoteEntry.js",
          },
        },
      });

      const resolved = loader.resolveMFE("widget");
      expect(resolved?.source).toBe("feature");
      expect(resolved?.routePrefix).toBe("/widget");
      // Secure by default
      expect(resolved?.requiresAuth).toBe(true);
      // Empty roles by default
      expect(resolved?.requiredRoles).toEqual([]);
      // basePath defaults to routePrefix
      expect(resolved?.basePath).toBe("/widget");
      // scope defaults to mfe name
      expect(resolved?.scope).toBe("widget");
    });

    it("respects explicit requiresAuth and requiredRoles", () => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        features: {
          "/pub": {
            mfe: "pub",
            entryUrl: "http://localhost:0/remoteEntry.js",
            requiresAuth: false,
          },
          "/admin": {
            mfe: "admin",
            entryUrl: "http://localhost:0/remoteEntry.js",
            requiredRoles: ["admin", "owner"],
          },
        },
      });

      expect(loader.resolveMFE("pub")?.requiresAuth).toBe(false);
      expect(loader.resolveMFE("admin")?.requiredRoles).toEqual(["admin", "owner"]);
    });

    it("resolves legacy remotes for backward compatibility", () => {
      loader.setConfig({
        remotes: [
          {
            name: "legacy",
            entryUrl: "http://localhost:0/remoteEntry.js",
            scope: "legacy",
            version: "1.0.0",
          },
        ],
      });

      const resolved = loader.resolveMFE("legacy");
      expect(resolved?.source).toBe("legacy");
    });

    it("returns null for unknown MFE", () => {
      loader.setConfig({ schemaVersion: "2.0.0" });
      expect(loader.resolveMFE("nope")).toBeNull();
    });
  });

  describe("matchRoute", () => {
    beforeEach(() => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        features: {
          "/widget": {
            mfe: "widget",
            entryUrl: "http://localhost:5174/remoteEntry.js",
          },
          "/widget/admin": {
            mfe: "widget-admin",
            entryUrl: "http://localhost:5175/remoteEntry.js",
          },
          "/dashboard": {
            mfe: "dashboard",
            entryUrl: "http://localhost:5176/remoteEntry.js",
          },
        },
      });
    });

    it("matches exact path", () => {
      expect(loader.matchRoute("/widget")?.name).toBe("widget");
    });

    it("matches sub-path via prefix", () => {
      expect(loader.matchRoute("/widget/list/1")?.name).toBe("widget");
    });

    it("returns null when no feature matches", () => {
      expect(loader.matchRoute("/nothing")).toBeNull();
    });

    it("uses longest-prefix wins", () => {
      expect(loader.matchRoute("/widget/admin/users")?.name).toBe("widget-admin");
    });

    it("distinguishes unrelated routes", () => {
      expect(loader.matchRoute("/dashboard/summary")?.name).toBe("dashboard");
    });
  });

  describe("listChromeMFEs", () => {
    it("returns empty array when no chrome section", () => {
      loader.setConfig({ schemaVersion: "2.0.0" });
      expect(loader.listChromeMFEs()).toEqual([]);
    });

    it("returns [slot, resolved] tuples", () => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "http://localhost:0/remoteEntry.js",
          },
          footer: {
            mfe: "footer",
            entryUrl: "http://localhost:0/remoteEntry.js",
          },
        },
      });
      const chrome = loader.listChromeMFEs();
      expect(chrome).toHaveLength(2);
      const [slot, mfe] = chrome[0];
      expect(slot).toBe("header");
      expect(mfe.name).toBe("header");
      expect(mfe.slot).toBe("header");
    });
  });

  describe("slot occupancy bookkeeping", () => {
    it("returns null for empty slot", () => {
      expect(loader.getSlotOccupant("main-slot")).toBeNull();
    });

    it("clears slot occupancy on demand", () => {
      // Manually seed occupancy via typed workaround for this white-box test
      (loader as unknown as { slotOccupancy: Map<string, string> }).slotOccupancy.set(
        "main-slot",
        "widget",
      );
      expect(loader.getSlotOccupant("main-slot")).toBe("widget");
      loader.clearSlot("main-slot");
      expect(loader.getSlotOccupant("main-slot")).toBeNull();
    });
  });

  describe("getStatus", () => {
    it("returns uninitialized status by default", () => {
      const status = loader.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.configLoaded).toBe(false);
      expect(status.remotesLoaded).toEqual([]);
    });

    it("returns initialized status after setConfig", () => {
      loader.setConfig({ schemaVersion: "2.0.0" });
      const status = loader.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.configLoaded).toBe(true);
      expect(status.remotesLoaded).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("resets all internal state", () => {
      loader.setConfig({ schemaVersion: "2.0.0" });
      expect(loader.getStatus().initialized).toBe(true);

      loader.clearCache();
      const status = loader.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.configLoaded).toBe(false);
      expect(status.remotesLoaded).toEqual([]);
    });
  });

  describe("resolveMFE returns null without config", () => {
    it("returns null when config is not set", () => {
      expect(loader.resolveMFE("any")).toBeNull();
    });
  });

  describe("matchRoute returns null without config", () => {
    it("returns null when features config is not set", () => {
      expect(loader.matchRoute("/any")).toBeNull();
    });
  });
});

describe("DynamicLoader init and loadRemote (happy-dom)", () => {
  let loader: DynamicLoader;

  beforeEach(() => {
    loader = new DynamicLoader();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("init", () => {
    it("should fetch config and emit success event", async () => {
      const validConfig: RemoteConfig = {
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "https://cdn.example.com/header/remoteEntry.js",
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validConfig,
      });

      const eventSpy = vi.fn();
      loader.on("config:fetch:success", eventSpy);

      await loader.init();

      expect(loader.getStatus().initialized).toBe(true);
      expect(loader.getStatus().configLoaded).toBe(true);
      expect(eventSpy).toHaveBeenCalledWith({ config: validConfig });
    });

    it("should not re-fetch if already initialized", async () => {
      const validConfig: RemoteConfig = { schemaVersion: "2.0.0" };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => validConfig,
      });

      await loader.init();
      const firstCall = (global.fetch as any).mock.calls.length;

      await loader.init();
      const secondCall = (global.fetch as any).mock.calls.length;

      expect(secondCall).toBe(firstCall); // No additional fetch
    });

    it("should emit error event on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const errorSpy = vi.fn();
      loader.on("config:fetch:error", errorSpy);

      await expect(loader.init({ maxRetries: 0 })).rejects.toThrow("Failed to fetch config");
      expect(errorSpy).toHaveBeenCalled();
      expect(loader.getStatus().initialized).toBe(false);
    });
  });

  describe("loadRemote", () => {
    it("should throw if loader not initialized", async () => {
      await expect(loader.loadRemote("header")).rejects.toThrow(
        "Loader not initialized. Call init() or setConfig() first.",
      );
    });

    it("should throw if remote not found in manifest", async () => {
      loader.setConfig({ schemaVersion: "2.0.0" });

      await expect(loader.loadRemote("missing")).rejects.toThrow(
        "Remote 'missing' not found in manifest",
      );
    });

    it("should throw if remote is disabled", async () => {
      loader.setConfig({
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "https://cdn.example.com/header/remoteEntry.js",
            enabled: false,
          },
        },
      });

      await expect(loader.loadRemote("header")).rejects.toThrow("Remote 'header' is disabled");
    });

    it("should return cached container if already loaded", async () => {
      const mockContainer = { init: vi.fn(), get: vi.fn() };

      loader.setConfig({
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "https://cdn.example.com/header/remoteEntry.js",
            scope: "header",
          },
        },
      });

      // Seed the loaded remotes map
      (loader as any).loadedRemotes.set("header", mockContainer);

      const container = await loader.loadRemote("header");
      expect(container).toBe(mockContainer);
    });

    it("should record slot occupancy when slotId provided", async () => {
      const mockContainer = { init: vi.fn(), get: vi.fn() };

      loader.setConfig({
        schemaVersion: "2.0.0",
        chrome: {
          header: {
            mfe: "header",
            entryUrl: "https://cdn.example.com/header/remoteEntry.js",
            scope: "header",
          },
        },
      });

      (loader as any).loadedRemotes.set("header", mockContainer);

      await loader.loadRemote("header", "header-slot");
      expect(loader.getSlotOccupant("header-slot")).toBe("header");
    });
  });
});
