/**
 * JWT payload decode helper (no signature verification — backend already validated).
 */

export interface DecodedTokenPayload {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as DecodedTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Build a User object from a JWT token, or null if the token cannot be decoded.
 */
export function userFromToken(token: string | null): {
  id: string;
  email: string;
  name: string;
  roles: string[];
} | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return {
    id: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    name: String(payload.name ?? payload.preferred_username ?? ""),
    roles: payload.realm_access?.roles ?? [],
  };
}
