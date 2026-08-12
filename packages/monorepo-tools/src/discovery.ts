import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MicroFrontend } from "./types.js";
import { loadPortMap, savePortMap, batchResolvePort } from "./port-map.js";

// Implements REQ-004: SHALL resolve development ports from the canonical local port map
// See openspec/changes/local-port-map-for-mfe-development/specs/monorepo-discovery/spec.md

// Get the workspace root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Discover all micro-frontends in the monorepo by scanning apps/mfes/mfe-* directories
 *
 * Scans for directories matching `apps/mfes/mfe-*` pattern, reads their package.json,
 * and extracts metadata including name, version, description, and port assignments.
 *
 * Ports are resolved from the canonical local port map:
 * - Existing mapped ports are reused when available
 * - Preferred ports from package.json mfe.port are used when available
 * - Alternate ports are assigned when preferred ports are occupied
 * - The port map is persisted after resolution
 *
 * Implements REQ-004, REQ-005
 * See openspec/changes/local-port-map-for-mfe-development/specs/monorepo-discovery/spec.md
 *
 * @param rootDir - Root directory of the monorepo (defaults to workspace root)
 * @param portMapPath - Path to the port map file (defaults to .local-port-map.json in rootDir)
 * @returns Array of MicroFrontend objects with metadata
 */
export async function discoverMicroFrontends(
  _rootDir: string = "",
  portMapPath?: string,
): Promise<MicroFrontend[]> {
  // Default to workspace root (3 levels up from this file)
  const workspaceRoot = _rootDir || join(__dirname, "../../../");

  // Find all apps/mfes/mfe-* directories
  const pattern = "apps/mfes/mfe-*/package.json";
  const packageJsonPaths = await glob(pattern, {
    cwd: workspaceRoot,
    absolute: true,
  });

  if (packageJsonPaths.length === 0) {
    return [];
  }

  // Load the canonical local port map (from custom path or default location in rootDir)
  const mapPath = portMapPath || join(workspaceRoot, ".local-port-map.json");
  const portMap = await loadPortMap(mapPath);

  // Read all package.json files
  const microFrontends: MicroFrontend[] = [];
  const appsToResolve: Array<{ appName: string; preferredPort: number }> = [];
  const pkgDataMap = new Map<string, { pkg: any; pkgDir: string; shortName: string }>();

  // Sort paths alphabetically for consistent processing order
  const sortedPaths = packageJsonPaths.sort();

  for (const pkgPath of sortedPaths) {
    try {
      const pkgContent = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);

      // Extract directory name (e.g., "mfe-widget" from ".../apps/mfes/mfe-widget/package.json")
      const pkgDir = dirname(pkgPath);
      const shortName = pkgDir.split("/").pop() || "";

      // Implements REQ-002: Support custom port override (preferred port from package.json)
      const customPort = pkg.mfe?.port;
      const preferredPort = customPort && typeof customPort === "number" ? customPort : 5174;

      appsToResolve.push({ appName: shortName, preferredPort });
      pkgDataMap.set(shortName, { pkg, pkgDir, shortName });
    } catch (error) {
      console.error(`Error reading ${pkgPath}:`, error);
      // Skip this package and continue
    }
  }

  // Implements REQ-004: Resolve ports from canonical local port map
  const portResolutions = await batchResolvePort(appsToResolve, portMap);

  // Build MicroFrontend objects with resolved ports
  for (const [shortName, resolution] of portResolutions) {
    const data = pkgDataMap.get(shortName);
    if (!data) continue;

    const { pkg, pkgDir } = data;

    // Extract metadata
    const name = pkg.name || shortName;
    const version = pkg.version || "0.0.0";
    const description = pkg.description;
    const customScope = pkg.mfe?.scope;

    // Derive scope from package name (or use custom)
    const scope = customScope || toScopeName(name);

    microFrontends.push({
      name,
      shortName,
      version,
      description,
      port: resolution.port,
      scope,
      path: pkgDir,
    });
  }

  // Implements REQ-005: Persist resolved ports back to the map
  await savePortMap(portMap, mapPath);

  return microFrontends;
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
