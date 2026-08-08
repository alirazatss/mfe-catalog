import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { createMFEViteConfig, createShellViteConfig } from "../vite-config-factories";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

describe("createMFEViteConfig", () => {
  it("returns valid Vite config with federation setup", () => {
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5555,
      exposes: {
        "./App": "./src/App.tsx",
      },
    });

    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.server?.port).toBe(5555);
    expect(config.preview?.port).toBe(5555);
    expect(config.build?.target).toBe("esnext");
  });

  it("includes single optimizeDeps block", () => {
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5555,
      exposes: {
        "./App": "./src/App.tsx",
      },
    });

    expect(config.optimizeDeps).toBeDefined();
    expect(config.optimizeDeps?.exclude).toContain("@mfe-runtime/auth");
    expect(config.optimizeDeps?.include).toContain("react");
    expect(config.optimizeDeps?.include).toContain("react-dom");
  });

  it("applies custom plugins before federation", () => {
    const customPlugin = { name: "custom-plugin" };
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5555,
      exposes: {
        "./App": "./src/App.tsx",
      },
      plugins: [customPlugin as any],
    });

    expect(config.plugins?.[0]).toBe(customPlugin);
  });

  it("respects cssCodeSplit option", () => {
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5555,
      exposes: {
        "./App": "./src/App.tsx",
      },
      cssCodeSplit: true,
    });

    expect(config.build?.cssCodeSplit).toBe(true);
  });

  it("applies bundleAllCSS option", () => {
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5555,
      exposes: {
        "./App": "./src/App.tsx",
      },
      bundleAllCSS: true,
    });

    expect(config.build?.rollupOptions?.output).toBeDefined();
  });

  it("sets correct server origin", () => {
    const config = createMFEViteConfig({
      name: "testMFE",
      port: 5174,
      exposes: {
        "./App": "./src/App.tsx",
      },
    });

    expect(config.server?.origin).toBe("http://localhost:5174");
  });
});

describe("createShellViteConfig", () => {
  it("returns valid Vite config with host setup", () => {
    const config = createShellViteConfig({
      shell: "website",
      deployEnv: "dev",
    });

    expect(config.plugins).toBeDefined();
    expect(Array.isArray(config.plugins)).toBe(true);
    expect(config.server?.port).toBe(5173);
    expect(config.preview?.port).toBe(5173);
    expect(config.build?.target).toBe("esnext");
  });

  it("includes optimizeDeps configuration", () => {
    const config = createShellViteConfig({
      shell: "website",
      deployEnv: "dev",
    });

    expect(config.optimizeDeps).toBeDefined();
    expect(config.optimizeDeps?.exclude).toContain("@mfe-runtime/auth");
    expect(config.optimizeDeps?.exclude).toContain("@mfe-runtime/shell-runtime");
  });

  it("defaults to dev environment", () => {
    const config = createShellViteConfig({
      shell: "website",
    });

    expect(config.plugins).toBeDefined();
    // Plugin configuration includes env-specific copy logic
    expect(config.plugins?.length).toBeGreaterThan(0);
  });

  it("includes copy-app-config-schema plugin", () => {
    const config = createShellViteConfig({
      shell: "website",
      deployEnv: "prod",
    });

    const plugins = config.plugins as any[];
    const schemaPlugin = plugins.find((p) => p?.name === "copy-app-config-schema");
    expect(schemaPlugin).toBeDefined();
    expect(schemaPlugin.closeBundle).toBeInstanceOf(Function);
  });

  it("includes copy-env-remote-config plugin", () => {
    const config = createShellViteConfig({
      shell: "website",
      deployEnv: "prod",
    });

    const plugins = config.plugins as any[];
    const configPlugin = plugins.find((p) => p?.name === "copy-env-remote-config");
    expect(configPlugin).toBeDefined();
    expect(configPlugin.closeBundle).toBeInstanceOf(Function);
  });

  it("includes federation host plugin", () => {
    const config = createShellViteConfig({
      shell: "website",
      deployEnv: "dev",
    });

    expect(config.plugins).toBeDefined();
    expect(config.plugins?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("createShellViteConfig plugin behavior", () => {
  let existsSyncMock: ReturnType<typeof vi.fn>;
  let copyFileSyncMock: ReturnType<typeof vi.fn>;
  let unlinkSyncMock: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const fs = await import("node:fs");
    existsSyncMock = fs.existsSync as any;
    copyFileSyncMock = fs.copyFileSync as any;
    unlinkSyncMock = fs.unlinkSync as any;
    existsSyncMock.mockReset();
    copyFileSyncMock.mockReset();
    unlinkSyncMock.mockReset();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("copy-app-config-schema throws when schema is missing", () => {
    existsSyncMock.mockReturnValue(false);
    const config = createShellViteConfig({ shell: "website", deployEnv: "dev" });
    const plugin = (config.plugins as any[]).find((p) => p?.name === "copy-app-config-schema");

    expect(() => plugin.closeBundle()).toThrow(/App config schema not found/);
  });

  it("copy-app-config-schema copies schema when present", () => {
    existsSyncMock.mockReturnValue(true);
    const config = createShellViteConfig({ shell: "website", deployEnv: "dev" });
    const plugin = (config.plugins as any[]).find((p) => p?.name === "copy-app-config-schema");

    plugin.closeBundle();
    expect(copyFileSyncMock).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Copied app-config schema"));
  });

  it("copy-env-remote-config throws when env config is missing", () => {
    existsSyncMock.mockReturnValue(false);
    const config = createShellViteConfig({ shell: "website", deployEnv: "prod" });
    const plugin = (config.plugins as any[]).find((p) => p?.name === "copy-env-remote-config");

    expect(() => plugin.closeBundle()).toThrow(/Environment-specific remote config not found/);
  });

  it("copy-env-remote-config copies config and removes env variants", () => {
    existsSyncMock.mockReturnValue(true);
    const config = createShellViteConfig({ shell: "website", deployEnv: "dev" });
    const plugin = (config.plugins as any[]).find((p) => p?.name === "copy-env-remote-config");

    plugin.closeBundle();
    expect(copyFileSyncMock).toHaveBeenCalled();
    expect(unlinkSyncMock).toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining("Copied remotes.config.dev.json"),
    );
  });

  it("copy-env-remote-config skips unlink when env variant doesn't exist in dist", () => {
    let callCount = 0;
    existsSyncMock.mockImplementation(() => {
      callCount++;
      return callCount === 1;
    });
    const config = createShellViteConfig({ shell: "website", deployEnv: "dev" });
    const plugin = (config.plugins as any[]).find((p) => p?.name === "copy-env-remote-config");

    plugin.closeBundle();
    expect(copyFileSyncMock).toHaveBeenCalled();
    expect(unlinkSyncMock).not.toHaveBeenCalled();
  });
});
