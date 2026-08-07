/**
 * App config loading for website shell.
 *
 * Fetches and validates /app-config.json during bootstrap.
 * - Production: Fails hard on any error (fetch, parse, validation)
 * - Development: Falls back to built-in default on fetch failure
 *
 * See: openspec/changes/app-config-contract/specs/shell-config-boot-validation/spec.md
 */

import { loadAppConfig, type AppConfig, LoadError } from "@mfe-runtime/app-config";

export interface ShellAppConfig {
  config: AppConfig;
  source: "remote" | "fallback";
}

/**
 * Built-in fallback config for development mode.
 * Mirrors the FALLBACK_REMOTES pattern. Only used when fetch fails in dev.
 */
export const DEV_FALLBACK_CONFIG: AppConfig = {
  schemaVersion: "0.1.0",
  apiBaseUrl: "http://localhost:4010",
  logoutUrl: "http://localhost:5173/logout",
  auth: {
    keycloakUrl: "http://localhost:8080",
    realm: "mfe-dev",
    clientId: "mfe-shell-dev",
  },
};

/**
 * Loads and validates the app config from /app-config.json.
 *
 * @param mode - Optional mode override for testing ('development' | 'production')
 * @throws {LoadError} In production, any error (fetch/parse/validation) throws.
 *                     In development, only validation errors throw; fetch errors fall back.
 */
export async function loadShellAppConfig(
  mode: "development" | "production" = import.meta.env.DEV ? "development" : "production",
): Promise<ShellAppConfig> {
  const isDev = mode === "development";

  try {
    const config = await loadAppConfig("/app-config.json");
    return { config, source: "remote" };
  } catch (error) {
    if (!(error instanceof LoadError)) {
      throw error;
    }

    // In production, fail hard on any error
    if (!isDev) {
      throw error;
    }

    // In development, only fetch errors get fallback; validation errors still throw
    if (error.category === "fetch") {
      console.warn(
        `[shell] Failed to load /app-config.json in dev mode: ${error.message}. Using built-in fallback.`,
      );
      return { config: DEV_FALLBACK_CONFIG, source: "fallback" };
    }

    // parse/validation errors throw even in dev
    throw error;
  }
}
