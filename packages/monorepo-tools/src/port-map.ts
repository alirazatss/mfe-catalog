import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";

// Implements REQ-001 (canonical local port map system)
// See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Canonical local port map — associates each shell and MFE with a resolved development port.
 *
 * Structure:
 * {
 *   "mfe-widget": 5174,
 *   "mfe-dashboard": 5175,
 *   "website": 5173
 * }
 */
export interface LocalPortMap {
  [appName: string]: number;
}

/**
 * Port resolution result
 */
export interface PortResolution {
  /** Resolved port number */
  port: number;
  /** True if this is a new assignment (not previously in the map) */
  isNew: boolean;
  /** True if the port was changed from a previous value */
  changed: boolean;
}

/**
 * Get the default path to the local port map file
 * Located at workspace root: .local-port-map.json
 */
export function getPortMapPath(rootDir?: string): string {
  const workspaceRoot = rootDir || join(__dirname, "../../../");
  return join(workspaceRoot, ".local-port-map.json");
}

/**
 * Load the local port map from disk
 * Returns empty object if file doesn't exist or is invalid
 *
 * Implements REQ-001: System SHALL maintain a canonical local port map
 */
export async function loadPortMap(mapPath?: string): Promise<LocalPortMap> {
  const path = mapPath || getPortMapPath();

  if (!existsSync(path)) {
    return {};
  }

  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);

    // Validate structure
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Invalid port map: expected object");
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== "string" || typeof value !== "number") {
        throw new Error(`Invalid port map entry: ${key} -> ${value}`);
      }
    }

    return parsed as LocalPortMap;
  } catch (error) {
    // Implements REQ-005: SHALL fail when invalid port map prevents resolution
    throw new Error(`Failed to parse local port map at ${path}: ${(error as Error).message}`);
  }
}

/**
 * Save the local port map to disk
 * Creates directory if needed
 */
export async function savePortMap(portMap: LocalPortMap, mapPath?: string): Promise<void> {
  const path = mapPath || getPortMapPath();
  const dir = dirname(path);

  // Ensure directory exists
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const content = JSON.stringify(portMap, null, 2);
  await writeFile(path, content, "utf-8");
}

/**
 * Check if a port is available (not in use)
 * Returns a promise that resolves to true if the port is free
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find the next available port in a range
 *
 * Implements REQ-002: SHALL resolve alternate available port when preferred port is occupied
 * Implements REQ-005: SHALL fail when no available local port can be resolved
 *
 * @param startPort - Port to start searching from (inclusive)
 * @param maxPort - Maximum port to try (inclusive, default 6000)
 * @param usedPorts - Set of ports already allocated in this session
 * @returns Next available port number
 * @throws Error if no port is available in range
 */
export async function findAvailablePort(
  startPort: number,
  maxPort: number = 6000,
  usedPorts: Set<number> = new Set(),
): Promise<number> {
  for (let port = startPort; port <= maxPort; port++) {
    if (usedPorts.has(port)) {
      continue;
    }

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  // Implements REQ-005: SHALL fail with explicit error when no port available
  throw new Error(
    `No available port found in range ${startPort}-${maxPort}. ` +
      `All ports are either in use or reserved.`,
  );
}

/**
 * Resolve a port for an app, following the canonical port map rules:
 *
 * 1. If app already has a resolved port in the map AND that port is available, reuse it (REQ-003)
 * 2. If the preferred port is available, use it (REQ-002)
 * 3. Otherwise, find an alternate available port (REQ-002)
 * 4. Update the map with the resolved port
 *
 * Implements REQ-001, REQ-002, REQ-003
 * See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md
 *
 * @param appName - Application name (e.g., "mfe-widget", "website")
 * @param preferredPort - Preferred port number (from package.json or default)
 * @param portMap - Current port map state
 * @param usedPorts - Ports already allocated in this session (to avoid duplicates)
 * @returns Port resolution result
 */
export async function resolvePort(
  appName: string,
  preferredPort: number,
  portMap: LocalPortMap,
  usedPorts: Set<number>,
): Promise<PortResolution> {
  const previousPort = portMap[appName];

  // Implements REQ-003: Reuse previously resolved port if still available
  if (
    previousPort !== undefined &&
    !usedPorts.has(previousPort) &&
    (await isPortAvailable(previousPort))
  ) {
    usedPorts.add(previousPort);
    return {
      port: previousPort,
      isNew: false,
      changed: false,
    };
  }

  // Implements REQ-002: Try preferred port first
  if (!usedPorts.has(preferredPort) && (await isPortAvailable(preferredPort))) {
    portMap[appName] = preferredPort;
    usedPorts.add(preferredPort);
    return {
      port: preferredPort,
      isNew: previousPort === undefined,
      changed: previousPort !== undefined && previousPort !== preferredPort,
    };
  }

  // Implements REQ-002: Find alternate available port
  const alternatePort = await findAvailablePort(preferredPort + 1, 6000, usedPorts);
  portMap[appName] = alternatePort;
  usedPorts.add(alternatePort);

  return {
    port: alternatePort,
    isNew: previousPort === undefined,
    changed: previousPort !== undefined && previousPort !== alternatePort,
  };
}

/**
 * Batch resolve ports for multiple apps
 * Ensures no duplicate port assignments within the batch
 *
 * @param apps - Array of {appName, preferredPort} tuples
 * @param portMap - Current port map state (will be mutated)
 * @returns Map of appName -> PortResolution
 */
export async function batchResolvePort(
  apps: Array<{ appName: string; preferredPort: number }>,
  portMap: LocalPortMap,
): Promise<Map<string, PortResolution>> {
  const usedPorts = new Set<number>();
  const results = new Map<string, PortResolution>();

  for (const { appName, preferredPort } of apps) {
    const resolution = await resolvePort(appName, preferredPort, portMap, usedPorts);
    results.set(appName, resolution);
  }

  return results;
}
