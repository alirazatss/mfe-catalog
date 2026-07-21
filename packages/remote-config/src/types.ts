/**
 * Manifest / remote-config types.
 *
 * Manifest v2 (chrome + features) is the new shape used by the thin shell.
 * The legacy `remotes` array is preserved for one release cycle for backward
 * compatibility (see `LegacyRemote`).
 *
 * See:
 * - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 * - docs/adr/0004-chrome-mfe-pattern.md
 */

/**
 * Common fields shared by chrome and feature MFEs.
 */
interface MFEBase {
  /** MFE name — matches Module Federation scope */
  mfe: string;
  /** URL to the remoteEntry.js file */
  entryUrl: string;
  /** Module Federation scope (defaults to mfe name) */
  scope?: string;
  /** Version identifier (semver or git hash) */
  version?: string;
  /** MFE-specific config passed as MFEProps.config */
  config?: Record<string, unknown>;
  /** Whether this MFE is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Chrome MFE — loaded once at bootstrap into a fixed slot (header, sidebar, footer).
 * Persists across route changes.
 */
export interface ChromeMFE extends MFEBase {}

/**
 * Feature MFE — loaded into main-slot based on URL prefix matching.
 * Mounted/unmounted as the user navigates between features.
 */
export interface FeatureMFE extends MFEBase {
  /** Base URL passed to the MFE as MFEProps.basePath (should match its key in the features map) */
  basePath?: string;
  /** Whether an authenticated session is required. Defaults to true (secure by default). */
  requiresAuth?: boolean;
  /** Role names required to access this feature. Empty means any authenticated user. */
  requiredRoles?: string[];
}

/**
 * The manifest fetched by the shell at bootstrap.
 *
 * `chrome` and `features` are the primary v2 fields.
 * `remotes` is retained for backward compatibility with pre-refactor MFE lists.
 */
export interface RemoteConfig {
  /** Reference to JSON Schema */
  $schema?: string;
  /** Manifest schema version. Used to invalidate cached manifests. */
  schemaVersion?: string;
  /** Chrome MFEs keyed by slot name (e.g., "header", "sidebar", "footer") */
  chrome?: Record<string, ChromeMFE>;
  /** Feature MFEs keyed by URL prefix (e.g., "/widget") */
  features?: Record<string, FeatureMFE>;
  /**
   * DEPRECATED — legacy remote array. Kept for one release cycle.
   * Migrate to `features` for route-based mounts.
   */
  remotes?: LegacyRemote[];
}

/**
 * DEPRECATED — pre-refactor remote entry shape.
 */
export interface LegacyRemote {
  name: string;
  entryUrl: string;
  scope: string;
  version: string;
  fallbackUrls?: string[];
  enabled?: boolean;
}

/**
 * DEPRECATED alias for backward compatibility with existing consumers.
 * @deprecated Use `LegacyRemote` (or migrate to `ChromeMFE` / `FeatureMFE`).
 */
export type Remote = LegacyRemote;
