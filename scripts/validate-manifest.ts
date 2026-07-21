import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ManifestSchema {
  version: string;
  timestamp: string;
  environment: "development" | "staging" | "production";
  microfrontends: Record<
    string,
    {
      version: string;
      url: string;
      integrity?: string;
      scope: string;
      module: string;
      metadata?: Record<string, unknown>;
    }
  >;
  cdn?: {
    baseUrl?: string;
    region?: string;
  };
}

/**
 * Validate a manifest object against the JSON schema
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Manifest must be an object"] };
  }

  const m = manifest as Partial<ManifestSchema>;

  // Validate required fields
  if (!m.version || typeof m.version !== "string") {
    errors.push('Missing or invalid "version" field');
  } else if (!/^\d+\.\d+\.\d+$/.test(m.version)) {
    errors.push("version must match pattern: major.minor.patch");
  }

  if (!m.timestamp || typeof m.timestamp !== "string") {
    errors.push('Missing or invalid "timestamp" field');
  }

  if (!m.environment || !["development", "staging", "production"].includes(m.environment)) {
    errors.push("environment must be one of: development, staging, production");
  }

  if (!m.microfrontends || typeof m.microfrontends !== "object") {
    errors.push('Missing or invalid "microfrontends" field');
  } else {
    // Validate each microfrontend
    for (const [name, mfe] of Object.entries(m.microfrontends)) {
      if (!/^mfe-[a-z0-9-]+$/.test(name)) {
        errors.push(`microfrontends.${name}: name must match pattern "mfe-[a-z0-9-]+"`);
      }

      if (!mfe.version || !/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/.test(mfe.version)) {
        errors.push(`microfrontends.${name}.version: must be a valid semver`);
      }

      if (!mfe.url || typeof mfe.url !== "string") {
        errors.push(`microfrontends.${name}.url: must be a string`);
      }

      if (mfe.integrity && !/^sha(256|384|512)-[A-Za-z0-9+/=]+$/.test(mfe.integrity)) {
        errors.push(`microfrontends.${name}.integrity: must match SRI hash pattern`);
      }

      if (!mfe.scope || typeof mfe.scope !== "string") {
        errors.push(`microfrontends.${name}.scope: must be a string`);
      }

      if (!mfe.module || !/^\.\/.+$/.test(mfe.module)) {
        errors.push(`microfrontends.${name}.module: must start with "./" `);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a manifest file
 */
export function validateManifestFile(filePath: string): { valid: boolean; errors: string[] } {
  try {
    const content = readFileSync(filePath, "utf-8");
    const manifest = JSON.parse(content);
    return validateManifest(manifest);
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Failed to parse manifest: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("Usage: tsx scripts/validate-manifest.ts <path-to-manifest.json>");
    process.exit(1);
  }

  const result = validateManifestFile(filePath);

  if (result.valid) {
    console.log("✓ Manifest is valid");
    process.exit(0);
  } else {
    console.error("✗ Manifest validation failed:");
    result.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
}
