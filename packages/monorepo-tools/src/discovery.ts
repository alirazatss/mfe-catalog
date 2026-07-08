import type { MicroFrontend } from "./types.js";

/**
 * Discover all micro-frontends in the monorepo by scanning apps/mfe-* directories
 *
 * This function will be implemented in Phase 2 (mfe-discovery-and-generation)
 * For now, it's a placeholder that returns an empty array.
 */
export async function discoverMicroFrontends(_rootDir: string = ""): Promise<MicroFrontend[]> {
  // TODO: Implement in Phase 2
  // - Use glob to find apps/mfe-* directories
  // - Read package.json from each
  // - Extract metadata (name, version, description)
  // - Assign ports alphabetically (5174, 5175, 5176...)
  // - Return array of MicroFrontend objects

  return [];
}

/**
 * Convert camelCase or kebab-case to camelCase scope name
 * Example: "mfe-widget" -> "mfeWidget"
 */
export function toScopeName(name: string): string {
  // Remove @scope/ prefix if present
  const cleanName = name.replace(/^@[^/]+\//, "");

  // Remove mfe- prefix
  const withoutPrefix = cleanName.replace(/^mfe-/, "");

  // Convert to camelCase
  return withoutPrefix.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
