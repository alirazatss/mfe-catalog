import { describe, it, expect, beforeEach } from "vite-plus/test";
import { DynamicLoader } from "../DynamicLoader.js";

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
});
