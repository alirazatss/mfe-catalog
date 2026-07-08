import Ajv, { type ValidateFunction } from "ajv";
import type { RemoteConfig } from "./types.js";

// Import the schema - will be available after build
// For now, inline the schema to avoid build issues
const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://mf-mono.local/schemas/remote-config.json",
  title: "Remote Configuration",
  description: "Configuration file for dynamically loaded micro-frontends",
  type: "object",
  properties: {
    $schema: {
      type: "string",
      description: "Reference to this JSON Schema",
    },
    remotes: {
      type: "array",
      description: "Array of remote micro-frontend configurations",
      items: {
        $ref: "#/definitions/remote",
      },
    },
  },
  required: ["remotes"],
  additionalProperties: false,
  definitions: {
    remote: {
      type: "object",
      description: "Configuration for a single remote micro-frontend",
      properties: {
        name: {
          type: "string",
          description: "Unique identifier for the remote (e.g., 'mfe-widget')",
          pattern: "^[a-z][a-z0-9-]*$",
        },
        entryUrl: {
          type: "string",
          description: "URL to the remoteEntry.js file",
          format: "uri",
        },
        scope: {
          type: "string",
          description: "Module Federation scope (e.g., 'mfeWidget')",
          pattern: "^[a-zA-Z][a-zA-Z0-9]*$",
        },
        version: {
          type: "string",
          description: "Version identifier (semver or git hash)",
        },
        fallbackUrls: {
          type: "array",
          description: "Fallback URLs to try if primary URL fails",
          items: {
            type: "string",
            format: "uri",
          },
        },
        enabled: {
          type: "boolean",
          description: "Whether this remote is enabled (defaults to true)",
          default: true,
        },
      },
      required: ["name", "entryUrl", "scope", "version"],
      additionalProperties: false,
    },
  },
};

let validateFn: ValidateFunction | null = null;

/**
 * Get or create the validation function (cached)
 */
function getValidator(): ValidateFunction {
  if (!validateFn) {
    const ajv = new Ajv({ allErrors: true });
    validateFn = ajv.compile(schema);
  }
  return validateFn;
}

/**
 * Validate a remote configuration object against the JSON Schema
 *
 * @param config - The configuration object to validate
 * @returns true if valid
 * @throws Error if validation fails with details
 */
export function validateRemoteConfig(config: unknown): config is RemoteConfig {
  const validate = getValidator();
  const valid = validate(config);

  if (!valid) {
    const errors = validate.errors || [];
    const errorMessages = errors.map((err) => {
      const path = err.instancePath || "root";
      return `${path}: ${err.message}`;
    });

    throw new Error(`Remote config validation failed:\n${errorMessages.join("\n")}`);
  }

  return true;
}

/**
 * Validate and return typed config, or null if invalid
 *
 * @param config - The configuration object to validate
 * @returns Typed RemoteConfig or null if invalid
 */
export function safeValidateRemoteConfig(config: unknown): RemoteConfig | null {
  try {
    if (validateRemoteConfig(config)) {
      return config;
    }
  } catch {
    return null;
  }
  return null;
}
