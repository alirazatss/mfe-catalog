import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Discover all MFEs and their configurations
 * @returns Array of MFE metadata
 */
export function discoverMFEsForShell() {
  const mfesDir = resolve(process.cwd(), "apps/mfes");
  
  if (!existsSync(mfesDir)) {
    console.warn(`⚠️  No MFEs directory found at ${mfesDir}`);
    return [];
  }

  const mfeDirs = readdirSync(mfesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  return mfeDirs.map((mfeName) => {
    const packageJsonPath = join(mfesDir, mfeName, "package.json");
    
    if (!existsSync(packageJsonPath)) {
      console.warn(`⚠️  No package.json found for ${mfeName}`);
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const viteConfigPath = join(mfesDir, mfeName, "vite.config.ts");
    
    let port = 5174; // Default fallback
    if (existsSync(viteConfigPath)) {
      const viteConfig = readFileSync(viteConfigPath, "utf-8");
      const portMatch = viteConfig.match(/port:\s*(\d+)/);
      if (portMatch) {
        port = parseInt(portMatch[1], 10);
      }
    }

    // Extract scope from package.json name or vite config
    const shortName = mfeName.replace(/^mfe-/, "");
    const scope = shortName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Determine base path (convention: /<short-name>)
    const basePath = `/${shortName}`;
    
    return {
      mfeName,
      scope,
      basePath,
      port,
      version: packageJson.version || "0.0.0",
    };
  }).filter(Boolean);
}

/**
 * Generate remotes.config.dev.json content from discovered MFEs
 */
export function generateDevRemotesConfig(mfes) {
  const features = {};
  
  for (const mfe of mfes) {
    features[mfe.basePath] = {
      mfe: mfe.mfeName,
      entryUrl: `http://localhost:${mfe.port}/remoteEntry.js`,
      scope: mfe.scope,
      version: mfe.version,
      basePath: mfe.basePath,
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    };
  }

  return {
    $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
    schemaVersion: "2.0.0",
    chrome: {},
    features,
  };
}

/**
 * Generate remotes.config.prod.json content from discovered MFEs
 */
export function generateProdRemotesConfig(mfes) {
  const features = {};
  
  for (const mfe of mfes) {
    features[mfe.basePath] = {
      mfe: mfe.mfeName,
      entryUrl: `https://tssmfestorage.blob.core.windows.net/mfes-prod/${mfe.mfeName}/v${mfe.version}/remoteEntry.js`,
      scope: mfe.scope,
      version: mfe.version,
      basePath: mfe.basePath,
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    };
  }

  return {
    $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
    schemaVersion: "2.0.0",
    chrome: {},
    features,
  };
}

/**
 * Wire shell to cleanup-previews.yml fallback list (idempotent)
 * @param {string} shellName - Shell name (e.g., 'website')
 */
export function wireShellToCleanupWorkflow(shellName) {
  const workflowPath = resolve(
    process.cwd(),
    ".github/workflows/cleanup-previews.yml"
  );

  if (!existsSync(workflowPath)) {
    console.warn(`⚠️  Workflow not found at ${workflowPath}`);
    return null;
  }

  const content = readFileSync(workflowPath, "utf-8");
  const startMarker = "# scaffold:shell-list:start";
  const endMarker = "# scaffold:shell-list:end";

  if (!content.includes(startMarker) || !content.includes(endMarker)) {
    throw new Error(
      `Missing markers in ${workflowPath}. ` +
      `Please add '${startMarker}' and '${endMarker}' around the shell fallback list, then re-run the generator.`
    );
  }

  // Extract the region between markers
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  const before = content.substring(0, startIndex + startMarker.length);
  const after = content.substring(endIndex);
  const region = content.substring(startIndex + startMarker.length, endIndex);

  // Parse the existing SHELLS list
  const shellListMatch = region.match(/SHELLS="([^"]*)"/);
  if (!shellListMatch) {
    throw new Error(
      `Could not find SHELLS="..." pattern between markers in ${workflowPath}`
    );
  }

  const currentList = shellListMatch[1].split(/\s+/).filter(Boolean);

  // Add new shell if not already present (idempotent)
  if (!currentList.includes(shellName)) {
    currentList.push(shellName);
    currentList.sort(); // Keep alphabetical
  }

  // Reconstruct the region
  const newList = currentList.join(" ");
  const newRegion = region.replace(/SHELLS="[^"]*"/, `SHELLS="${newList}"`);

  // Write back
  const newContent = before + newRegion + after;
  writeFileSync(workflowPath, newContent, "utf-8");

  return workflowPath;
}
