/**
 * Configuration for a single remote micro-frontend
 */
export interface Remote {
  /** Unique identifier for the remote (e.g., 'mfe-widget') */
  name: string;
  /** URL to the remoteEntry.js file */
  entryUrl: string;
  /** Module Federation scope (e.g., 'mfeWidget') */
  scope: string;
  /** Version identifier (semver or git hash) */
  version: string;
  /** Fallback URLs to try if primary URL fails */
  fallbackUrls?: string[];
  /** Whether this remote is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Remote configuration file structure
 */
export interface RemoteConfig {
  /** Reference to JSON Schema */
  $schema?: string;
  /** Array of remote micro-frontend configurations */
  remotes: Remote[];
}
