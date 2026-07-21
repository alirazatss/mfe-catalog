import { describe, it, expect } from "vite-plus/test";
import { decodeJwtPayload, userFromToken } from "./jwt.js";

function b64url(input: string): string {
  return btoa(input).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function makeJwt(payload: object): string {
  return `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify(payload),
  )}.sig`;
}

describe("decodeJwtPayload", () => {
  it("decodes a JWT payload", () => {
    const payload = decodeJwtPayload(makeJwt({ sub: "u1", email: "a@b.com" }));
    expect(payload).toEqual({ sub: "u1", email: "a@b.com" });
  });

  it("returns null for malformed tokens", () => {
    expect(decodeJwtPayload("nope")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("aaa.bbb")).toBeNull();
  });

  it("returns null when payload is not JSON", () => {
    const bad = ["aaa", b64url("not-json"), "sig"].join(".");
    expect(decodeJwtPayload(bad)).toBeNull();
  });
});

describe("userFromToken", () => {
  it("returns null for null input", () => {
    expect(userFromToken(null)).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(userFromToken("not-a-jwt")).toBeNull();
  });

  it("extracts Keycloak-style claims", () => {
    const token = makeJwt({
      sub: "u1",
      email: "alice@example.com",
      name: "Alice",
      realm_access: { roles: ["user"] },
    });
    expect(userFromToken(token)).toEqual({
      id: "u1",
      email: "alice@example.com",
      name: "Alice",
      roles: ["user"],
    });
  });

  it("falls back to preferred_username when name missing", () => {
    const token = makeJwt({ sub: "u", preferred_username: "alice42" });
    expect(userFromToken(token)?.name).toBe("alice42");
  });

  it("defaults empty roles when missing", () => {
    const token = makeJwt({ sub: "u" });
    expect(userFromToken(token)?.roles).toEqual([]);
  });
});
