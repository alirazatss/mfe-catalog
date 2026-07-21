import { describe, it, expect } from "vite-plus/test";
import { decodeJWT, hasRequiredRoles, userFromToken } from "./auth-helpers.js";

/**
 * Build a fake JWT with the given payload. Signature is unused (we don't verify).
 */
function makeJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const body = btoa(JSON.stringify(payload))
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.signature`;
}

describe("decodeJWT", () => {
  it("decodes a valid JWT payload", () => {
    const token = makeJwt({ sub: "abc", email: "a@b.com" });
    expect(decodeJWT(token)).toMatchObject({ sub: "abc", email: "a@b.com" });
  });

  it("returns null for malformed JWT", () => {
    expect(decodeJWT("not.a.token")).toBeNull();
    expect(decodeJWT("only-one-part")).toBeNull();
    expect(decodeJWT("")).toBeNull();
  });

  it("returns null for JWT with non-JSON payload", () => {
    // Valid base64 but not JSON
    const token = ["h", btoa("not-json"), "sig"].join(".");
    expect(decodeJWT(token)).toBeNull();
  });
});

describe("userFromToken", () => {
  it("extracts a user from a Keycloak-style token", () => {
    const token = makeJwt({
      sub: "user-1",
      email: "a@b.com",
      name: "Alice",
      realm_access: { roles: ["user", "admin"] },
    });
    expect(userFromToken(token)).toEqual({
      id: "user-1",
      email: "a@b.com",
      name: "Alice",
      roles: ["user", "admin"],
    });
  });

  it("falls back to preferred_username when name missing", () => {
    const token = makeJwt({ sub: "u", preferred_username: "alice42" });
    expect(userFromToken(token)?.name).toBe("alice42");
  });

  it("returns null for null token", () => {
    expect(userFromToken(null)).toBeNull();
  });

  it("returns null for malformed token", () => {
    expect(userFromToken("garbage")).toBeNull();
  });

  it("defaults roles to empty array when missing", () => {
    const token = makeJwt({ sub: "u" });
    expect(userFromToken(token)?.roles).toEqual([]);
  });
});

describe("hasRequiredRoles", () => {
  const user = { id: "1", email: "", name: "", roles: ["user"] };

  it("allows any user when required list is empty", () => {
    expect(hasRequiredRoles(user, [])).toBe(true);
    expect(hasRequiredRoles(null, [])).toBe(true);
  });

  it("denies null user when a role is required", () => {
    expect(hasRequiredRoles(null, ["admin"])).toBe(false);
  });

  it("allows when user has at least one required role", () => {
    expect(hasRequiredRoles(user, ["user", "admin"])).toBe(true);
  });

  it("denies when user has none of the required roles", () => {
    expect(hasRequiredRoles(user, ["admin"])).toBe(false);
  });
});
