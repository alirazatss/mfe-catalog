import { glob } from "glob";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MicroFrontend } from "./types.js";

// Get the workspace root (3 levels up from this file)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Discover all micro-frontends in the monorepo by scanning apps/mfe-* directories
 *
 * Scans for directories matching `apps/mfe-*` pattern, reads their package.json,
 * and extracts metadata including name, version, description, and port assignments.
 *
 * @param rootDir - Root directory of the monorepo (defaults to workspace root)
 * @returns Array of MicroFrontend objects with metadata
 */
export async function discoverMicroFrontends(_rootDir: string = ""): Promise<MicroFrontend[]> {
  // Default to workspace root (3 levels up from this file)
  const workspaceRoot = _rootDir || join(__dirname, "../../../");

  // Find all apps/mfe-* directories
  const pattern = "apps/mfe-*/package.json";
  const packageJsonPaths = await glob(pattern, {
    cwd: workspaceRoot,
    absolute: true,
  });

  if (packageJsonPaths.length === 0) {
    return [];
  }

  // Read all package.json files
  const microFrontends: MicroFrontend[] = [];
  const usedPorts = new Set<number>();
  let nextPort = 5174; // Start port

  // Sort paths alphabetically to ensure consistent port assignment
  const sortedPaths = packageJsonPaths.sort();

  for (const pkgPath of sortedPaths) {
    try {
      const pkgContent = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgContent);

      // Extract directory name (e.g., "mfe-widget" from ".../apps/mfe-widget/package.json")
      const pkgDir = dirname(pkgPath);
      const shortName = pkgDir.split("/").pop() || "";

      // Extract metadata
      const name = pkg.name || shortName;
      const version = pkg.version || "0.0.0";
      const description = pkg.description;

      // Check for custom port in package.json mfe config
      const customPort = pkg.mfe?.port;
      const customScope = pkg.mfe?.scope;

      // Assign port (custom or next available)
      let port: number;
      if (customPort && typeof customPort === "number") {
        if (usedPorts.has(customPort)) {
          throw new Error(`Port conflict: ${customPort} is already used by another micro-frontend`);
        }
        port = customPort;
      } else {
        // Find next available port
        while (usedPorts.has(nextPort)) {
          nextPort++;
        }
        port = nextPort;
        nextPort++;
      }

      usedPorts.add(port);

      // Derive scope from package name (or use custom)
      const scope = customScope || toScopeName(name);

      microFrontends.push({
        name,
        shortName,
        version,
        description,
        port,
        scope,
        path: pkgDir,
      });
    } catch (error) {
      console.error(`Error reading ${pkgPath}:`, error);
      // Skip this package and continue
    }
  }

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
