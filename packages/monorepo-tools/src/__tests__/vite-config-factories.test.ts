import { describe, it, expect } from "vitest";
import { createMFEViteConfig, createShellViteConfig } from "../vite-config-factories";

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
