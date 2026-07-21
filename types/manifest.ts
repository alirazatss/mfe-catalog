/**
 * TypeScript types for deployment manifest
 * Generated from manifest.schema.json
 */

export interface MicroFrontendManifest {
  /** Manifest schema version (semver) */
  version: string;

  /** ISO 8601 timestamp when manifest was generated */
  timestamp: string;

  /** Target deployment environment */
  environment: "development" | "staging" | "production";

  /** Map of micro-frontend name to configuration */
  microfrontends: Record<string, MicroFrontendEntry>;

  /** Optional CDN configuration */
  cdn?: CDNConfig;
}

export interface MicroFrontendEntry {
  /** Semantic version of the micro-frontend (e.g., "1.2.3" or "1.2.3-beta.1") */
  version: string;

  /** Full CDN URL to the remoteEntry.js file */
  url: string;

  /** Subresource Integrity hash for security verification (e.g., "sha384-...") */
  integrity?: string;

  /** Module Federation scope name */
  scope: string;

  /** Exposed module path (e.g., "./App") */
  module: string;

  /** Optional build metadata */
  metadata?: MicroFrontendMetadata;
}

export interface MicroFrontendMetadata {
  /** Git commit hash */
  buildHash?: string;

  /** ISO 8601 timestamp of build */
  buildDate?: string;

  /** URL to changelog or release notes */
  changelog?: string;

  /** Additional custom metadata */
  [key: string]: unknown;
}

export interface CDNConfig {
  /** Base URL of the CDN */
  baseUrl?: string;

  /** CDN region (e.g., "us-east-1") */
  region?: string;
}

/**
 * Type guard to check if an object is a valid MicroFrontendManifest
 */
export function isManifest(obj: unknown): obj is MicroFrontendManifest {
  if (!obj || typeof obj !== "object") return false;

  const m = obj as Partial<MicroFrontendManifest>;

  return (
    typeof m.version === "string" &&
    typeof m.timestamp === "string" &&
    typeof m.environment === "string" &&
    ["development", "staging", "production"].includes(m.environment) &&
    typeof m.microfrontends === "object" &&
    m.microfrontends !== null
  );
}
