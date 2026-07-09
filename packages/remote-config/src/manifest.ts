import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

/**
 * Manifest structure for production micro-frontend deployment
 */
export interface Manifest {
  $schema?: string;
  version: string; // Manifest schema version (semver)
  timestamp: string; // ISO 8601 timestamp
  environment: "development" | "staging" | "production";
  microfrontends: Record<string, MicroFrontendEntry>;
  cdn?: CDNConfig;
}

export interface MicroFrontendEntry {
  version: string; // MFE version (semver)
  url: string; // CDN URL to remoteEntry.js
  scope: string; // Module Federation scope
  module: string; // Exposed module path (e.g., "./App")
  integrity?: string; // SRI hash (optional for dev)
  metadata?: MFEMetadata;
}

export interface MFEMetadata {
  buildHash?: string; // Git commit SHA
  buildDate?: string; // ISO 8601 timestamp
  changelog?: string; // URL to release notes
}

export interface CDNConfig {
  baseUrl: string;
  region?: string;
}

// Import manifest schema
const manifestSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Micro-Frontend Manifest",
  description: "Manifest file describing deployed micro-frontends and their versions",
  type: "object",
  required: ["version", "timestamp", "environment", "microfrontends"],
  properties: {
    $schema: {
      type: "string",
    },
    version: {
      type: "string",
      description: "Manifest schema version",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "When this manifest was generated",
    },
    environment: {
      type: "string",
      enum: ["development", "staging", "production"],
      description: "Target environment",
    },
    microfrontends: {
      type: "object",
      description: "Map of micro-frontend name to configuration",
      patternProperties: {
        "^mfe-[a-z0-9-]+$": {
          type: "object",
          required: ["version", "url", "scope", "module"],
          properties: {
            version: {
              type: "string",
              description: "Semantic version of the micro-frontend",
              pattern: "^\\d+\\.\\d+\\.\\d+(-[a-z0-9.]+)?$",
            },
            url: {
              type: "string",
              format: "uri",
              description: "CDN URL to the remoteEntry.js",
            },
            integrity: {
              type: "string",
              description: "Subresource Integrity hash for security",
              pattern: "^sha(256|384|512)-[A-Za-z0-9+/=]+$",
            },
            scope: {
              type: "string",
              description: "Module Federation scope name",
            },
            module: {
              type: "string",
              description: "Exposed module path",
              pattern: "^\\./[A-Za-z0-9_-]+$",
            },
            metadata: {
              type: "object",
              properties: {
                buildHash: {
                  type: "string",
                  description: "Git commit hash",
                },
                buildDate: {
                  type: "string",
                  format: "date-time",
                },
                changelog: {
                  type: "string",
                  format: "uri",
                },
              },
            },
          },
        },
      },
    },
    cdn: {
      type: "object",
      description: "CDN configuration",
      properties: {
        baseUrl: {
          type: "string",
          format: "uri",
        },
        region: {
          type: "string",
        },
      },
    },
  },
  additionalProperties: false,
};

let manifestValidateFn: ValidateFunction | null = null;

/**
 * Get or create the manifest validation function (cached)
 */
function getManifestValidator(): ValidateFunction {
  if (!manifestValidateFn) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    manifestValidateFn = ajv.compile(manifestSchema);
  }
  return manifestValidateFn;
}

/**
 * Validate a manifest object against the JSON Schema
 *
 * @param manifest - The manifest object to validate
 * @returns true if valid
 * @throws Error if validation fails with details
 */
export function validateManifest(manifest: unknown): manifest is Manifest {
  const validate = getManifestValidator();
  const valid = validate(manifest);

  if (!valid) {
    const errors = validate.errors || [];
    const errorMessages = errors.map((err) => {
      const path = err.instancePath || "root";
      return `${path}: ${err.message}`;
    });

    throw new Error(`Manifest validation failed:\n${errorMessages.join("\n")}`);
  }

  return true;
}

/**
 * Validate and return typed manifest, or null if invalid
 *
 * @param manifest - The manifest object to validate
 * @returns Typed Manifest or null if invalid
 */
export function safeValidateManifest(manifest: unknown): Manifest | null {
  try {
    if (validateManifest(manifest)) {
      return manifest;
    }
  } catch {
    return null;
  }
  return null;
}
