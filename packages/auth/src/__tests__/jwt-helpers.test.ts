import { describe, it, expect } from "vitest";
import { decodeJWT, userFromToken, hasRequiredRoles } from "../jwt-helpers";

describe("decodeJWT", () => {
  it("decodes a valid JWT", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbInVzZXIiLCJhZG1pbiJdfX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const decoded = decodeJWT(token);
    expect(decoded).toMatchObject({
      sub: "1234567890",
      name: "John Doe",
      email: "john@example.com",
      realm_access: { roles: ["user", "admin"] },
    });
  });

  it("returns null for invalid JWT structure", () => {
    expect(decodeJWT("invalid")).toBeNull();
    expect(decodeJWT("only.two")).toBeNull();
  });

  it("returns null for malformed base64", () => {
    expect(decodeJWT("a.b!!!.c")).toBeNull();
  });
});

describe("userFromToken", () => {
  it("extracts user from valid token", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZW1haWwiOiJqb2huQGV4YW1wbGUuY29tIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbInVzZXIiLCJhZG1pbiJdfX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    const user = userFromToken(token);
    expect(user).toEqual({
      id: "1234567890",
      email: "john@example.com",
      name: "John Doe",
      roles: ["user", "admin"],
    });
  });

  it("returns null for null token", () => {
    expect(userFromToken(null)).toBeNull();
  });

  it("returns null for invalid token", () => {
    expect(userFromToken("invalid")).toBeNull();
  });

  it("uses preferred_username as fallback for name", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0ZXN0dXNlciJ9.fake";
    const decoded = decodeJWT(token);
    if (!decoded) throw new Error("Token decode failed");
    const user = userFromToken(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0ZXN0dXNlciJ9.fake",
    );
    expect(user?.name).toBe("testuser");
  });

  it("defaults to empty roles array when missing", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCJ9.fake";
    const user = userFromToken(token);
    expect(user?.roles).toEqual([]);
  });
});

describe("hasRequiredRoles", () => {
  const user = {
    id: "123",
    email: "test@example.com",
    name: "Test User",
    roles: ["user", "editor"],
  };

  it("returns true when user has any required role", () => {
    expect(hasRequiredRoles(user, ["admin", "editor"])).toBe(true);
  });

  it("returns false when user lacks all required roles", () => {
    expect(hasRequiredRoles(user, ["admin", "superuser"])).toBe(false);
  });

  it("returns true for empty required roles", () => {
    expect(hasRequiredRoles(user, [])).toBe(true);
  });

  it("returns false for null user with required roles", () => {
    expect(hasRequiredRoles(null, ["user"])).toBe(false);
  });

  it("returns true for null user with no required roles", () => {
    expect(hasRequiredRoles(null, [])).toBe(true);
  });
});
