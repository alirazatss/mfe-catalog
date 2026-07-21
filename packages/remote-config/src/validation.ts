import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { RemoteConfig } from "./types.js";

// Inline schema so validation works before build.
// Kept in sync with packages/remote-config/schema.json.
const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://mf-mono.local/schemas/remote-config.json",
  title: "Remote Manifest",
  description:
    "Manifest listing chrome MFEs (always mounted) and feature MFEs (route-based) for a shell.",
  type: "object",
  properties: {
    $schema: { type: "string" },
    schemaVersion: { type: "string", default: "2.0.0" },
    chrome: {
      type: "object",
      additionalProperties: { $ref: "#/definitions/chromeMFE" },
    },
    features: {
      type: "object",
      additionalProperties: { $ref: "#/definitions/featureMFE" },
    },
    remotes: {
      type: "array",
      items: { $ref: "#/definitions/legacyRemote" },
    },
  },
  additionalProperties: false,
  definitions: {
    chromeMFE: {
      type: "object",
      properties: {
        mfe: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9-]*$" },
        entryUrl: { type: "string", format: "uri-reference" },
        scope: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9]*$" },
        version: { type: "string" },
        config: { type: "object", additionalProperties: true },
        enabled: { type: "boolean", default: true },
      },
      required: ["mfe", "entryUrl"],
      additionalProperties: false,
    },
    featureMFE: {
      type: "object",
      properties: {
        mfe: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9-]*$" },
        entryUrl: { type: "string", format: "uri-reference" },
        scope: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9]*$" },
        version: { type: "string" },
        basePath: { type: "string", pattern: "^/" },
        requiresAuth: { type: "boolean", default: true },
        requiredRoles: {
          type: "array",
          items: { type: "string" },
          default: [],
        },
        config: { type: "object", additionalProperties: true },
        enabled: { type: "boolean", default: true },
      },
      required: ["mfe", "entryUrl"],
      additionalProperties: false,
    },
    legacyRemote: {
      type: "object",
      properties: {
        name: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
        entryUrl: { type: "string", format: "uri-reference" },
        scope: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9]*$" },
        version: { type: "string" },
        fallbackUrls: {
          type: "array",
          items: { type: "string", format: "uri-reference" },
        },
        enabled: { type: "boolean", default: true },
      },
      required: ["name", "entryUrl", "scope", "version"],
      additionalProperties: false,
    },
  },
} as const;

let validateFn: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!validateFn) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    validateFn = ajv.compile(schema);
  }
  return validateFn;
}

/**
 * Validate a remote manifest against the JSON Schema.
 *
 * @param config - The manifest object to validate
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

    throw new Error(`Remote manifest validation failed:\n${errorMessages.join("\n")}`);
  }

  return true;
}

/**
 * Validate and return typed manifest, or null if invalid.
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
