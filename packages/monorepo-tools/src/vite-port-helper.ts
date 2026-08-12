import { readFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

// Implements REQ-001, REQ-003, REQ-004: Wire Vite startup to canonical port map
// See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md

/**
 * Get the resolved port for an app from the canonical local port map.
 * Falls back to the provided default port if:
 * - The port map file doesn't exist
 * - The app is not in the port map
 * - The port map is invalid
 *
 * This function is synchronous to work in Vite config context.
 *
 * @param appName - Application name (e.g., "mfe-widget", "website")
 * @param defaultPort - Fallback port if not in map
 * @param workspaceRoot - Optional workspace root (auto-detected if not provided)
 * @returns Resolved port number
 */
export function getResolvedPort(
  appName: string,
  defaultPort: number,
  workspaceRoot?: string,
): number {
  try {
    // Auto-detect workspace root if not provided
    // Vite configs are typically 3-4 levels deep from workspace root
    const root = workspaceRoot || findWorkspaceRoot();
    const portMapPath = join(root, ".local-port-map.json");

    if (!existsSync(portMapPath)) {
      return defaultPort;
    }

    const content = readFileSync(portMapPath, "utf-8");
    const portMap = JSON.parse(content);

    if (typeof portMap !== "object" || portMap === null || Array.isArray(portMap)) {
      console.warn(
        `[port-map] Invalid port map format, using default port ${defaultPort} for ${appName}`,
      );
      return defaultPort;
    }

    const resolvedPort = portMap[appName];

    if (typeof resolvedPort !== "number") {
      // App not in map yet, return default
      return defaultPort;
    }

    return resolvedPort;
  } catch (error) {
    console.warn(
      `[port-map] Failed to read port map, using default port ${defaultPort} for ${appName}:`,
      error,
    );
    return defaultPort;
  }
}

/**
 * Get the resolved port for the current MFE from its package.json and the port map.
 *
 * Implements REQ-002: Reads custom port from package.json mfe.port as the preferred port
 * Implements REQ-001, REQ-003: Uses resolved port from canonical map
 *
 * Usage in MFE vite.config.ts:
 * ```ts
 * import { getResolvedPortFromPackage } from "@mfe-runtime/monorepo-tools";
 * const PORT = getResolvedPortFromPackage(import.meta.url);
 * ```
 *
 * @param importMetaUrl - import.meta.url from the calling Vite config
 * @param defaultPort - Fallback port (default 5174)
 * @returns Resolved port number
 */
export function getResolvedPortFromPackage(
  importMetaUrl: string,
  defaultPort: number = 5174,
): number {
  try {
    // Convert import.meta.url to file path
    const configPath = fileURLToPath(importMetaUrl);
    const mfeDir = dirname(configPath);
    const pkgPath = join(mfeDir, "package.json");

    if (!existsSync(pkgPath)) {
      console.warn(
        `[port-map] package.json not found at ${pkgPath}, using default port ${defaultPort}`,
      );
      return defaultPort;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

    // Get short name from directory (e.g., "mfe-widget")
    const shortName = basename(mfeDir);

    // Get preferred port from package.json mfe.port (REQ-002)
    const preferredPort = pkg.mfe?.port || defaultPort;

    // Get resolved port from canonical map (REQ-001, REQ-003)
    return getResolvedPort(shortName, preferredPort);
  } catch (error) {
    console.warn(
      `[port-map] Failed to read package.json or port map, using default port ${defaultPort}:`,
      error,
    );
    return defaultPort;
  }
}

/**
 * Find the workspace root by walking up from the current directory
 * looking for pnpm-workspace.yaml or package.json with workspaces field
 */
function findWorkspaceRoot(startDir?: string): string {
  let currentDir = startDir || process.cwd();

  // Walk up max 10 levels
  for (let i = 0; i < 10; i++) {
    // Check for pnpm-workspace.yaml
    if (existsSync(join(currentDir, "pnpm-workspace.yaml"))) {
      return currentDir;
    }

    // Check for package.json with workspaces
    const pkgPath = join(currentDir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.workspaces || pkg.private) {
          return currentDir;
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  // Fallback to cwd if workspace root not found
  return process.cwd();
}
