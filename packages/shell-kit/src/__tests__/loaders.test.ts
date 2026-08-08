import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { loadManifest, loadShellAppConfig } from "../loaders";
import type { RemoteConfig } from "@mfe-runtime/remote-config";
import type { AppConfig } from "@mfe-runtime/app-config";

vi.mock("@mfe-runtime/remote-config", () => ({
  safeValidateRemoteConfig: vi.fn((raw) => raw),
}));

vi.mock("@mfe-runtime/app-config", () => ({
  loadAppConfig: vi.fn(),
  LoadError: class LoadError extends Error {
    category: string;
    constructor(message: string, category: string) {
      super(message);
      this.category = category;
      this.name = "LoadError";
    }
  },
}));

describe("loadManifest", () => {
  const fallbackManifest: RemoteConfig = { remotes: [] };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns manifest on successful fetch", async () => {
    const manifest: RemoteConfig = { remotes: [{ name: "mfe1", url: "http://example.com" }] };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(manifest),
      } as Response),
    ) as any;

    const result = await loadManifest("/test.json", fallbackManifest);
    expect(result).toEqual(manifest);
  });

  it("retries on fetch failure and returns fallback after exhausting retries", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 } as Response)) as any;

    const result = await loadManifest("/test.json", fallbackManifest);
    expect(result).toEqual(fallbackManifest);
    expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 10000);

  it("returns fallback when validation fails", async () => {
    const { safeValidateRemoteConfig } = await import("@mfe-runtime/remote-config");
    (safeValidateRemoteConfig as any).mockReturnValueOnce(null);

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ invalid: "data" }),
      } as Response),
    ) as any;

    const result = await loadManifest("/test.json", fallbackManifest);
    expect(result).toEqual(fallbackManifest);
  }, 10000);
});

describe("loadShellAppConfig", () => {
  const devFallback: AppConfig = {
    schemaVersion: "0.1.0",
    apiBaseUrl: "http://localhost:4010",
    logoutUrl: "http://localhost:5173/logout",
    auth: {
      keycloakUrl: "http://localhost:8080",
      realm: "mfe-dev",
      clientId: "mfe-shell-dev",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns remote config on successful load", async () => {
    const { loadAppConfig } = await import("@mfe-runtime/app-config");
    const config: AppConfig = { ...devFallback };
    (loadAppConfig as any).mockResolvedValueOnce(config);

    const result = await loadShellAppConfig("/app-config.json", devFallback, "production");
    expect(result).toEqual({ config, source: "remote" });
  });

  it("throws in production on fetch error", async () => {
    const { loadAppConfig, LoadError } = await import("@mfe-runtime/app-config");
    (loadAppConfig as any).mockRejectedValueOnce(new LoadError("Fetch failed", "fetch"));

    await expect(loadShellAppConfig("/app-config.json", devFallback, "production")).rejects.toThrow(
      "Fetch failed",
    );
  });

  it("returns fallback in dev on fetch error", async () => {
    const { loadAppConfig, LoadError } = await import("@mfe-runtime/app-config");
    (loadAppConfig as any).mockRejectedValueOnce(new LoadError("Fetch failed", "fetch"));

    const result = await loadShellAppConfig("/app-config.json", devFallback, "development");
    expect(result).toEqual({ config: devFallback, source: "fallback" });
  });

  it("throws in dev on validation error", async () => {
    const { loadAppConfig, LoadError } = await import("@mfe-runtime/app-config");
    (loadAppConfig as any).mockRejectedValueOnce(new LoadError("Validation failed", "validation"));

    await expect(
      loadShellAppConfig("/app-config.json", devFallback, "development"),
    ).rejects.toThrow("Validation failed");
  });

  it("throws in dev when fetch fails but no fallback provided", async () => {
    const { loadAppConfig, LoadError } = await import("@mfe-runtime/app-config");
    (loadAppConfig as any).mockRejectedValueOnce(new LoadError("Fetch failed", "fetch"));

    await expect(loadShellAppConfig("/app-config.json", undefined, "development")).rejects.toThrow(
      "Fetch failed",
    );
  });
});
