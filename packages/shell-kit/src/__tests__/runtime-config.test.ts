import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { createRuntimeConfig } from "../runtime-config";
import type { AppConfig } from "@mfe-runtime/app-config";
import type { RemoteConfig } from "@mfe-runtime/remote-config";
import type { TokenManager } from "../auth-bridge";

vi.mock("../loaders", () => ({
  loadManifest: vi.fn((url, fallback) => Promise.resolve(fallback)),
}));

describe("createRuntimeConfig", () => {
  let mockTokenManager: TokenManager;
  let mockAppConfig: AppConfig;
  let mockFallbackManifest: RemoteConfig;

  beforeEach(() => {
    mockTokenManager = {
      getAccessToken: vi.fn(() => "test-token"),
      isAuthenticated: vi.fn(() => true),
      clear: vi.fn(),
    };

    mockAppConfig = {
      schemaVersion: "0.1.0",
      apiBaseUrl: "http://localhost:4010",
      logoutUrl: "http://localhost:5173/logout",
      auth: {
        keycloakUrl: "http://localhost:8080",
        realm: "mfe-dev",
        clientId: "mfe-shell-dev",
      },
    };

    mockFallbackManifest = { remotes: [] };
  });

  it("returns a valid ShellRuntimeConfig", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    expect(config.manifest).toBeDefined();
    expect(config.auth).toBeDefined();
    expect(config.navigation).toBeDefined();
    expect(config.resolveSlot).toBeDefined();
    expect(config.renderer).toBeDefined();
    expect(config.getSharedProps).toBeDefined();
  });

  it("manifest.load() returns fallback manifest", async () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const manifest = await config.manifest.load();
    expect(manifest).toEqual(mockFallbackManifest);
  });

  it("auth.isAuthenticated() delegates to tokenManager", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    expect(config.auth.isAuthenticated()).toBe(true);
    expect(mockTokenManager.isAuthenticated).toHaveBeenCalled();
  });

  it("auth.getUser() extracts user from token", () => {
    mockTokenManager.getAccessToken = vi.fn(
      () =>
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbInVzZXIiXX19.fake",
    );

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const user = config.auth.getUser();
    expect(user).toMatchObject({
      id: "123",
      email: "test@example.com",
      name: "Test User",
      roles: ["user"],
    });
  });

  it("auth.getRoles() returns roles from token", () => {
    mockTokenManager.getAccessToken = vi.fn(
      () =>
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCIsInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJ1c2VyIiwiYWRtaW4iXX19.fake",
    );

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const roles = config.auth.getRoles?.();
    expect(roles).toEqual(["user", "admin"]);
  });

  it("resolveSlot() uses default main-slot pattern", () => {
    document.body.innerHTML = '<div id="main-slot"></div>';

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const slot = config.resolveSlot("main");
    expect(slot).toBeTruthy();
    expect(slot?.id).toBe("main-slot");
  });

  it("resolveSlot() accepts custom resolver", () => {
    document.body.innerHTML = '<div id="custom-main"></div>';

    const customResolver = vi.fn((slot: string) =>
      document.getElementById(slot === "main" ? "custom-main" : `custom-${slot}`),
    );

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
      resolveSlot: customResolver,
    });

    const slot = config.resolveSlot("main");
    expect(customResolver).toHaveBeenCalledWith("main");
    expect(slot?.id).toBe("custom-main");
  });

  it("renderer uses default console renderer when not provided", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    config.renderer.render({
      phase: "route",
      scope: { kind: "route" },
      error: new Error("Test error"),
      severity: "error",
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("renderer accepts custom renderer override", () => {
    const customRender = vi.fn();
    const customClear = vi.fn();

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
      failureRenderer: {
        render: customRender,
        clear: customClear,
      },
    });

    config.renderer.render({
      phase: "route",
      scope: { kind: "route" },
      error: new Error("Test"),
      severity: "error",
    });

    expect(customRender).toHaveBeenCalled();
  });

  it("getSharedProps() returns user and isAuthenticated by default", () => {
    mockTokenManager.getAccessToken = vi.fn(
      () =>
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCJ9.fake",
    );

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const props = config.getSharedProps?.();
    expect(props).toMatchObject({
      user: expect.objectContaining({
        id: "123",
        email: "test@example.com",
      }),
      isAuthenticated: true,
    });
  });

  it("getSharedProps() accepts custom factory override", () => {
    const customFactory = vi.fn(() => ({ customProp: "value" }));

    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
      getSharedProps: customFactory,
    });

    const props = config.getSharedProps?.();
    expect(customFactory).toHaveBeenCalled();
    expect(props).toEqual({ customProp: "value" });
  });

  it("navigation.currentUrl() returns current URL", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const url = config.navigation.currentUrl();
    expect(url).toBeInstanceOf(URL);
  });

  it("navigation.navigate() updates history and triggers listener", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const listener = vi.fn();
    const unsubscribe = config.navigation.subscribe(listener);

    config.navigation.navigate("/test-path");

    // The listener should be called after navigation
    expect(listener).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/test-path");

    unsubscribe();
  });

  it("navigation.navigate() with replace option uses replaceState", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    config.navigation.navigate("/replace-path", { replace: true });

    expect(replaceStateSpy).toHaveBeenCalled();
    replaceStateSpy.mockRestore();
  });

  it("navigation.subscribe() cleanup function removes listeners", () => {
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const listener = vi.fn();
    const unsubscribe = config.navigation.subscribe(listener);

    unsubscribe();

    // After unsubscribe, navigation should not trigger listener
    config.navigation.navigate("/after-unsubscribe");

    // Listener should only be called once from initial subscription, not from navigate
    expect(listener).toHaveBeenCalledTimes(0);
  });

  it("navigation NAVIGATE event ignores invalid payload", async () => {
    const { emitMFEEvent, MFE_EVENTS } = await import("@mfe-runtime/events");
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const listener = vi.fn();
    const unsubscribe = config.navigation.subscribe(listener);

    // Invalid payloads: null, missing path, non-string path, non-absolute path
    emitMFEEvent(MFE_EVENTS.NAVIGATE, null as any);
    emitMFEEvent(MFE_EVENTS.NAVIGATE, {} as any);
    emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: 123 } as any);
    emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "relative-path" } as any);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("navigation NAVIGATE event with valid payload triggers listener", async () => {
    const { emitMFEEvent, MFE_EVENTS } = await import("@mfe-runtime/events");
    const config = createRuntimeConfig(mockAppConfig, {
      tokenManager: mockTokenManager,
      fallbackManifest: mockFallbackManifest,
    });

    const listener = vi.fn();
    const unsubscribe = config.navigation.subscribe(listener);

    emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/valid-path" });
    expect(listener).toHaveBeenCalled();

    // Also test replace variant
    listener.mockClear();
    emitMFEEvent(MFE_EVENTS.NAVIGATE, { path: "/replace-path", replace: true });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
