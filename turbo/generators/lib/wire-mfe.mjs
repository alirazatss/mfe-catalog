import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

/**
 * Wire a new MFE into all shell remotes.config.{dev,prod}.json files
 * @param {string} mfeName - Full MFE name (e.g., 'mfe-orders')
 * @param {string} scope - Module Federation scope (e.g., 'orders')
 * @param {string} basePath - Route base path (e.g., '/orders')
 * @param {number} port - Dev server port
 * @param {string} version - Initial version (default: '0.0.0')
 */
export function wireToShellConfigs(mfeName, scope, basePath, port, version = "0.0.0") {
  const shellsDir = resolve(process.cwd(), "apps/shells");
  
  if (!existsSync(shellsDir)) {
    console.warn(`⚠️  No shells directory found at ${shellsDir}`);
    return [];
  }

  const shells = readdirSync(shellsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  if (shells.length === 0) {
    console.warn("⚠️  No shells found in apps/shells/");
    return [];
  }

  const modifiedFiles = [];

  for (const shell of shells) {
    const publicDir = join(shellsDir, shell, "public");
    
    if (!existsSync(publicDir)) {
      console.warn(`⚠️  No public/ directory for shell ${shell}, skipping`);
      continue;
    }

    // Wire dev config
    const devConfigPath = join(publicDir, "remotes.config.dev.json");
    if (existsSync(devConfigPath)) {
      wireConfig(
        devConfigPath,
        mfeName,
        scope,
        basePath,
        `http://localhost:${port}/remoteEntry.js`,
        version
      );
      modifiedFiles.push(devConfigPath);
    }

    // Wire prod config
    const prodConfigPath = join(publicDir, "remotes.config.prod.json");
    if (existsSync(prodConfigPath)) {
      wireConfig(
        prodConfigPath,
        mfeName,
        scope,
        basePath,
        `https://tssmfestorage.blob.core.windows.net/mfes-prod/${mfeName}/v${version}/remoteEntry.js`,
        version
      );
      modifiedFiles.push(prodConfigPath);
    }
  }

  return modifiedFiles;
}

/**
 * Wire a single config file
 */
function wireConfig(configPath, mfeName, scope, basePath, entryUrl, version) {
  const config = JSON.parse(readFileSync(configPath, "utf-8"));

  // Add the new MFE entry
  config.features[basePath] = {
    mfe: mfeName,
    entryUrl,
    scope,
    version,
    basePath,
    requiresAuth: false,
    requiredRoles: [],
    enabled: true,
  };

  // Validate against schema
  validateConfig(config, configPath);

  // Write back with 2-space indentation
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * Validate config against the manifest schema
 */
function validateConfig(config, configPath) {
  const schemaPath = resolve(
    process.cwd(),
    "packages/remote-config/schema.json"
  );

  if (!existsSync(schemaPath)) {
    console.warn(`⚠️  Schema not found at ${schemaPath}, skipping validation`);
    return;
  }

  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(config);

  if (!valid) {
    console.error(`❌ Config validation failed for ${configPath}:`);
    console.error(JSON.stringify(validate.errors, null, 2));
    throw new Error(`Config validation failed for ${configPath}`);
  }
}

/**
 * Wire MFE to cleanup-previews.yml fallback list (idempotent)
 * @param {string} mfeName - Full MFE name (e.g., 'mfe-orders')
 */
export function wireToCleanupWorkflow(mfeName) {
  const workflowPath = resolve(
    process.cwd(),
    ".github/workflows/cleanup-previews.yml"
  );

  if (!existsSync(workflowPath)) {
    console.warn(`⚠️  Workflow not found at ${workflowPath}`);
    return null;
  }

  const content = readFileSync(workflowPath, "utf-8");
  const startMarker = "# scaffold:mfe-list:start";
  const endMarker = "# scaffold:mfe-list:end";

  if (!content.includes(startMarker) || !content.includes(endMarker)) {
    throw new Error(
      `Missing markers in ${workflowPath}. ` +
      `Please add '${startMarker}' and '${endMarker}' around the MFE fallback list, then re-run the generator.`
    );
  }

  // Extract the region between markers
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  const before = content.substring(0, startIndex + startMarker.length);
  const after = content.substring(endIndex);
  const region = content.substring(startIndex + startMarker.length, endIndex);

  // Parse the existing MFES list
  const mfeListMatch = region.match(/MFES="([^"]*)"/);
  if (!mfeListMatch) {
    throw new Error(
      `Could not find MFES="..." pattern between markers in ${workflowPath}`
    );
  }

  const currentList = mfeListMatch[1].split(/\s+/).filter(Boolean);

  // Add new MFE if not already present (idempotent)
  if (!currentList.includes(mfeName)) {
    currentList.push(mfeName);
    currentList.sort(); // Keep alphabetical
  }

  // Reconstruct the region
  const newList = currentList.join(" ");
  const newRegion = region.replace(/MFES="[^"]*"/, `MFES="${newList}"`);

  // Write back
  const newContent = before + newRegion + after;
  writeFileSync(workflowPath, newContent, "utf-8");

  return workflowPath;
}
