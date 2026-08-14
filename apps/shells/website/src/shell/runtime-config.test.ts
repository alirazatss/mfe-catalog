import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { AppConfig } from "@mfe-runtime/app-config";

vi.mock("@mfe-runtime/auth", () => ({
  tokenManager: {
    refreshToken: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn().mockReturnValue(false),
    getAccessToken: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("./auth-bridge.js", () => ({
  setupAuthBridge: vi.fn(),
}));

vi.mock("./manifest.js", () => ({
  fetchManifest: vi.fn(),
}));

import { tokenManager } from "@mfe-runtime/auth";
import { createWebsiteFailureRenderer, createWebsiteShellRuntimeConfig } from "./runtime-config.js";
import { fetchManifest } from "./manifest.js";

const mockedTokenManager = vi.mocked(tokenManager);
const mockedFetchManifest = vi.mocked(fetchManifest);

const mockAppConfig: AppConfig = {
  schemaVersion: "0.1.0",
  apiBaseUrl: "https://api.test.com",
  logoutUrl: "https://test.com/logout",
  auth: {
    keycloakUrl: "https://auth.test.com",
    realm: "test-realm",
    clientId: "test-client",
  },
};

describe("website runtime config", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app">
        <div id="header-slot"></div>
        <main id="main-slot"></main>
      </div>
      <template id="shell-template-not-found"><div class="shell-not-found">Not found</div></template>
      <template id="shell-template-access-denied"><div class="shell-access-denied">Access denied</div></template>
      <template id="shell-template-critical-error"><div class="shell-critical-error">Critical</div></template>
    `;
    mockedTokenManager.isAuthenticated.mockReturnValue(false);
    mockedTokenManager.getAccessToken.mockReturnValue(null);
    mockedFetchManifest.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("propagates manifest fetch failure (TSB-1: no fallback)", async () => {
    // Scenario: manifest.load rejects when fetchManifest rejects (no FALLBACK_REMOTES)
    // WHEN fetchManifest rejects
    // THEN manifest.load rejects (shell-runtime will call failureRenderer with critical scope)

    mockedFetchManifest.mockRejectedValue(new Error("Network error"));
    const config = createWebsiteShellRuntimeConfig(mockAppConfig);
    await expect(config.manifest.load()).rejects.toThrow("Network error");
  });

  it("redirects unauthenticated route failures to login with returnUrl", async () => {
    const renderer = createWebsiteFailureRenderer();
    await renderer.render({
      phase: "route",
      scope: { kind: "route" },
      error: new Error("auth required"),
      severity: "error",
      route: "unauthenticated",
      url: "/widget/counter",
    });

    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toContain("returnUrl=%2Fwidget%2Fcounter");
  });

  it("renders not-found and denied templates for route failures", async () => {
    const renderer = createWebsiteFailureRenderer();

    await renderer.render({
      phase: "route",
      scope: { kind: "route" },
      error: new Error("missing"),
      severity: "warning",
      route: "not-found",
      url: "/missing",
    });
    expect(document.getElementById("main-slot")?.textContent).toContain("Not found");

    await renderer.render({
      phase: "route",
      scope: { kind: "route" },
      error: new Error("denied"),
      severity: "error",
      route: "forbidden",
      url: "/admin",
    });
    expect(document.getElementById("main-slot")?.textContent).toContain("Access denied");
  });
});
