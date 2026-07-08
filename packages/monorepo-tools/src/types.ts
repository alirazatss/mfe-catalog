/**
 * MicroFrontend metadata extracted from package.json and filesystem
 */
export interface MicroFrontend {
  /** Package name (e.g., "@mf-mono/mfe-widget") */
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
 * Remote configuration entry for the generated config file
 */
export interface RemoteConfigEntry {
  /** Remote name/identifier */
  name: string;
  /** URL to remoteEntry.js */
  entryUrl: string;
  /** Module Federation scope */
  scope: string;
  /** Version (e.g., git hash or semver) */
  version: string;
  /** Optional fallback URLs */
  fallbackUrls?: string[];
  /** Whether this remote is enabled */
  enabled?: boolean;
}

/**
 * Full remote configuration file structure
 */
export interface RemoteConfig {
  /** JSON Schema reference */
  $schema?: string;
  /** Array of remote entries */
  remotes: RemoteConfigEntry[];
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
}
