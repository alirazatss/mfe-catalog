// Implements app-scaffolding: port assignment requirement
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const START_PORT = 5174;

/**
 * Assign the next free dev-server port by scanning existing MFEs
 *
 * Implements app-scaffolding: port assignment requirement
 * Uses discoverMicroFrontends() logic to find lowest unused port >= 5174
 */
export function assignPort() {
  const workspaceRoot = process.cwd();
  const usedPorts = new Set();

  const mfesDir = join(workspaceRoot, "apps/mfes");
  
  if (!existsSync(mfesDir)) {
    return START_PORT;
  }

  // Scan existing MFE vite configs to find used ports
  const entries = readdirSync(mfesDir);
  
  for (const entry of entries) {
    if (!entry.startsWith("mfe-")) continue;
    
    const configPath = join(mfesDir, entry, "vite.config.ts");
    if (!existsSync(configPath)) continue;
    
    try {
      const content = readFileSync(configPath, "utf-8");

      // Extract port from "port: XXXX" pattern
      const portMatch = content.match(/port:\s*(\d+)/);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        if (!isNaN(port)) {
          usedPorts.add(port);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read ${configPath}:`, error);
    }
  }

  // Find the lowest free port >= START_PORT
  let candidatePort = START_PORT;
  while (usedPorts.has(candidatePort)) {
    candidatePort++;
  }

  return candidatePort;
}
