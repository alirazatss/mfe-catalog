import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { DynamicLoader } from "@mf-mono/dynamic-loader";
import { evaluateRoute } from "./router.js";

// Mock tokenManager (we only need isAuthenticated + getAccessToken here)
vi.mock("@mf-mono/auth", () => ({
  tokenManager: {
    isAuthenticated: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

import { tokenManager } from "@mf-mono/auth";

const mockedTokenManager = vi.mocked(tokenManager);

function makeLoader(): DynamicLoader {
  const loader = new DynamicLoader();
  loader.setConfig({
    schemaVersion: "2.0.0",
    features: {
      "/widget": {
        mfe: "widget",
        entryUrl: "http://localhost:5174/remoteEntry.js",
        basePath: "/widget",
        requiresAuth: true,
        requiredRoles: [],
        enabled: true,
      },
      "/marketing": {
        mfe: "marketing",
        entryUrl: "http://localhost:5175/remoteEntry.js",
        basePath: "/marketing",
        requiresAuth: false,
        enabled: true,
      },
      "/admin": {
        mfe: "admin",
        entryUrl: "http://localhost:5176/remoteEntry.js",
        basePath: "/admin",
        requiresAuth: true,
        requiredRoles: ["admin"],
        enabled: true,
      },
    },
  });
  return loader;
}

describe("evaluateRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns not-found when no feature matches", () => {
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/nowhere");
    expect(outcome).toEqual({ kind: "not-found" });
  });

  it("returns allow when authenticated user hits protected route with no role restriction", () => {
    mockedTokenManager.isAuthenticated.mockReturnValue(true);
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/widget/list");
    expect(outcome.kind).toBe("allow");
    if (outcome.kind === "allow") {
      expect(outcome.feature.name).toBe("widget");
    }
  });

  it("returns redirect when unauthenticated user hits protected route", () => {
    mockedTokenManager.isAuthenticated.mockReturnValue(false);
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/widget/list");
    expect(outcome.kind).toBe("redirect");
    if (outcome.kind === "redirect") {
      expect(outcome.to).toBe("/login?returnUrl=%2Fwidget%2Flist");
    }
  });

  it("returns allow for unauthenticated user on public route", () => {
    mockedTokenManager.isAuthenticated.mockReturnValue(false);
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/marketing");
    expect(outcome.kind).toBe("allow");
  });

  it("returns denied when authenticated user lacks required role", () => {
    mockedTokenManager.isAuthenticated.mockReturnValue(true);
    // Fake token with only 'user' role
    const roleToken = makeTokenWithRoles(["user"]);
    mockedTokenManager.getAccessToken.mockReturnValue(roleToken);
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/admin/dashboard");
    expect(outcome.kind).toBe("denied");
  });

  it("returns allow when authenticated user has required role", () => {
    mockedTokenManager.isAuthenticated.mockReturnValue(true);
    const roleToken = makeTokenWithRoles(["admin"]);
    mockedTokenManager.getAccessToken.mockReturnValue(roleToken);
    const loader = makeLoader();
    const outcome = evaluateRoute(loader, "/admin/dashboard");
    expect(outcome.kind).toBe("allow");
  });

  it("defaults missing requiresAuth to true (secure by default)", () => {
    const loader = new DynamicLoader();
    loader.setConfig({
      schemaVersion: "2.0.0",
      features: {
        "/secret": {
          mfe: "secret",
          entryUrl: "http://localhost:0/remoteEntry.js",
          basePath: "/secret",
          // no requiresAuth field → normalized to true by loader
        },
      },
    });
    mockedTokenManager.isAuthenticated.mockReturnValue(false);
    const outcome = evaluateRoute(loader, "/secret");
    expect(outcome.kind).toBe("redirect");
  });

  it("uses longest-prefix wins for overlapping routes", () => {
    const loader = new DynamicLoader();
    loader.setConfig({
      schemaVersion: "2.0.0",
      features: {
        "/widget": {
          mfe: "widget",
          entryUrl: "http://localhost:0/remoteEntry.js",
          basePath: "/widget",
          requiresAuth: false,
        },
        "/widget/admin": {
          mfe: "widget-admin",
          entryUrl: "http://localhost:0/remoteEntry.js",
          basePath: "/widget/admin",
          requiresAuth: false,
        },
      },
    });
    const outcome = evaluateRoute(loader, "/widget/admin/settings");
    expect(outcome.kind).toBe("allow");
    if (outcome.kind === "allow") {
      expect(outcome.feature.name).toBe("widget-admin");
    }
  });
});

function makeTokenWithRoles(roles: string[]): string {
  const header = btoaUrl(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoaUrl(
    JSON.stringify({
      sub: "u",
      email: "a@b.com",
      name: "Alice",
      realm_access: { roles },
    }),
  );
  return `${header}.${body}.sig`;
}

function btoaUrl(s: string): string {
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
