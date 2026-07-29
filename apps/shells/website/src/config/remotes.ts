/**
 * Fallback micro-frontend configuration for the shell.
 *
 * MVP Architecture:
 * - The shell serves `/remotes.config.json` from its public directory
 * - This fallback is used if fetching that static file fails (network error, server issue, etc.)
 * - Both the served config and this fallback contain the same MFE list in the MVP
 *
 * Keep this synchronized with `apps/shells/website/public/remotes.config.json`.
 *
 * Future: As the config service evolves, this fallback can serve as a bootstrap config
 * if an external config service becomes temporarily unavailable.
 */

import type { RemoteConfig } from "@mfe-runtime/remote-config";

/**
 * Fallback remote configuration.
 * Updated during development to match the generated config structure.
 *
 * In production, this serves as a bootstrap config if the shell's static file serving
 * becomes temporarily unavailable.
 */
export const FALLBACK_REMOTES: RemoteConfig = {
  $schema: "../node_modules/@mfe-runtime/remote-config/schema.json",
  schemaVersion: "2.0.0",
  chrome: {},
  features: {
    "/": {
      mfe: "mfe-landing-page",
      entryUrl: "http://localhost:5175/remoteEntry.js",
      scope: "landingPage",
      version: "0.0.0",
      basePath: "/",
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    },
    "/widget": {
      mfe: "mfe-widget",
      entryUrl: "http://localhost:5174/remoteEntry.js",
      scope: "widget",
      version: "0.0.0",
      basePath: "/widget",
      requiresAuth: false,
      requiredRoles: [],
      enabled: true,
    },
  },
};
