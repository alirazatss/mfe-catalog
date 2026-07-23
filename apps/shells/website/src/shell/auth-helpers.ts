/**
 * Thin Shell — JWT + role helpers.
 *
 * Small, pure utilities used by the vanilla bootstrap for auth/role guards.
 * No React, no framework — just JWT decode + role checks.
 */

interface DecodedToken {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  [key: string]: unknown;
}

export interface DecodedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

/**
 * Decode a JWT payload without verification.
 * Backend already validated the token; this is just to read claims client-side.
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payload) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Extract a user profile from a decoded JWT.
 * Returns null if the payload cannot be interpreted.
 */
export function userFromToken(token: string | null): DecodedUser | null {
  if (!token) return null;
  const payload = decodeJWT(token);
  if (!payload) return null;

  return {
    id: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    name: String(payload.name ?? payload.preferred_username ?? ""),
    roles: payload.realm_access?.roles ?? [],
  };
}

/**
 * Check whether the user has ANY of the required roles.
 * Empty `requiredRoles` means no role restriction (returns true for any user).
 */
export function hasRequiredRoles(user: DecodedUser | null, requiredRoles: string[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!user) return false;
  return requiredRoles.some((role) => user.roles.includes(role));
}
