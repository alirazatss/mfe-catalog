/**
 * MicroFrontend metadata extracted from package.json and filesystem
 */
export interface MicroFrontend {
  /** Package name (e.g., "@mfe-runtime/mfe-widget") */
  name: string;
  /** Short name extracted from directory (e.g., "mfe-widget") */
  shortName: string;
  /** Version from package.json */
  version: string;
  /** Description from package.json */
  description?: string;
  /** Assigned development port (e.g., 5174) */
  port: number;
  /** Module Federation scope (defaults to camelCase shortName) */
  scope: string;
  /** Absolute path to the package directory */
  path: string;
}

/**
 * DEPRECATED — legacy remote configuration entry (pre-thin-shell refactor).
 * Kept for one release cycle for backward compatibility.
 * Migrate to `FeatureMFEEntry` (route-based) or `ChromeMFEEntry` (slot-based).
 */
export interface RemoteConfigEntry {
  name: string;
  entryUrl: string;
  scope: string;
  version: string;
  fallbackUrls?: string[];
  enabled?: boolean;
}

/**
 * Chrome MFE entry — loaded at bootstrap into a fixed slot.
 */
export interface ChromeMFEEntry {
  mfe: string;
  entryUrl: string;
  scope?: string;
  version?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * Feature MFE entry — loaded into main-slot based on URL prefix match.
 */
export interface FeatureMFEEntry {
  mfe: string;
  entryUrl: string;
  scope?: string;
  version?: string;
  basePath?: string;
  requiresAuth?: boolean;
  requiredRoles?: string[];
  config?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * Manifest file structure (v2 — chrome + features).
 * The legacy `remotes` array is preserved for backward compatibility.
 */
export interface RemoteConfig {
  /** JSON Schema reference */
  $schema?: string;
  /** Manifest schema version (default: "2.0.0") */
  schemaVersion?: string;
  /** Chrome MFEs keyed by slot name */
  chrome?: Record<string, ChromeMFEEntry>;
  /** Feature MFEs keyed by URL prefix (e.g., "/widget") */
  features?: Record<string, FeatureMFEEntry>;
  /** DEPRECATED — legacy remotes array */
  remotes?: RemoteConfigEntry[];
}

/**
 * Options for config generation
 */
export interface ConfigGenerationOptions {
  /** Environment: development or production */
  environment: "development" | "production";
  /** Git hash for versioning (production only) */
  gitHash?: string;
  /** Base URL for production deployments */
  baseUrl?: string;
  /** Output file path */
  outputPath?: string;
  /** Release channel (e.g., "release-4.10") for channel-specific URLs */
  channel?: string;
}
