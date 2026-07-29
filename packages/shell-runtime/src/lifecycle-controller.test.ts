import { describe, expect, it, vi } from "vite-plus/test";
import {
  DynamicLoader,
  type Container,
  type MFELifecycle,
  type MFEProps,
  type ResolvedMFE,
} from "@mfe-runtime/dynamic-loader";
import { createShellRuntime } from "./index.js";

function makeResolved(name: string, slot = "main"): ResolvedMFE {
  return {
    name,
    entryUrl: `http://localhost/${name}/remoteEntry.js`,
    scope: name,
    enabled: true,
    source: slot === "main" ? "feature" : "chrome",
    slot: slot === "main" ? undefined : slot,
    routePrefix: slot === "main" ? `/${name}` : undefined,
    basePath: slot === "main" ? `/${name}` : undefined,
    requiresAuth: false,
    requiredRoles: [],
  };
}

describe("shell-runtime lifecycle behavior", () => {
  it("mounts a lifecycle remote and bootstraps it only once", async () => {
    const bootstrap = vi.fn<(props: MFEProps) => Promise<void>>().mockResolvedValue(undefined);
    const mount = vi.fn<(props: MFEProps) => Promise<void>>().mockResolvedValue(undefined);
    const unmount = vi.fn<(props: MFEProps) => Promise<void>>().mockResolvedValue(undefined);

    const lifecycle: MFELifecycle = { bootstrap, mount, unmount };
    const container: Container = {
      init: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(() => lifecycle),
    };

    const loader = new DynamicLoader();
    loader.setConfig({
      schemaVersion: "2.0.0",
      features: {
        "/widget": {
          mfe: "widget",
          entryUrl: "http://localhost:5174/remoteEntry.js",
          requiresAuth: false,
        },
      },
    });
    vi.spyOn(loader, "loadRemote").mockResolvedValue(container);

    const runtime = createShellRuntime({
      manifest: {
        load: async () => ({
          schemaVersion: "2.0.0",
          features: {
            "/widget": {
              mfe: "widget",
              entryUrl: "http://localhost:5174/remoteEntry.js",
              requiresAuth: false,
            },
          },
        }),
      },
      auth: {
        isAuthenticated: () => false,
        getUser: () => null,
      },
      navigation: {
        currentUrl: () => new URL("http://localhost/widget"),
        subscribe: () => () => {},
        navigate: () => {},
      },
      resolveSlot: (slot: string) => (slot === "main" ? document.createElement("div") : null),
      renderer: {
        render: () => {},
        clear: () => {},
      },
      loader,
    } as any);

    await runtime.start();
    await runtime.stop();
    await runtime.start();

    expect(bootstrap).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it("rejects remotes without required lifecycle functions", async () => {
    const badModule = { default: () => null };
    const container: Container = {
      init: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(() => badModule),
    };
    const loader = new DynamicLoader();
    loader.setConfig({
      schemaVersion: "2.0.0",
      features: {
        "/widget": {
          mfe: "widget",
          entryUrl: "http://localhost:5174/remoteEntry.js",
          requiresAuth: false,
        },
      },
    });
    vi.spyOn(loader, "loadRemote").mockResolvedValue(container);

    const runtime = createShellRuntime({
      manifest: {
        load: async () => ({
          schemaVersion: "2.0.0",
          features: {
            "/widget": {
              mfe: "widget",
              entryUrl: "http://localhost:5174/remoteEntry.js",
              requiresAuth: false,
            },
          },
        }),
      },
      auth: {
        isAuthenticated: () => false,
        getUser: () => null,
      },
      navigation: {
        currentUrl: () => new URL("http://localhost/widget"),
        subscribe: () => () => {},
        navigate: () => {},
      },
      resolveSlot: (slot: string) => (slot === "main" ? document.createElement("div") : null),
      renderer: {
        render: () => {},
        clear: () => {},
      },
      loader,
    } as any);

    await expect(runtime.start()).rejects.toThrow(/lifecycle/i);
  });
});
