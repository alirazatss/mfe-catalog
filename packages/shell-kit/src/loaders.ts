/**
 * @mfe-runtime/shell-kit — Config loaders (manifest + app-config)
 *
 * Implements shell-kit / Resilient config loaders.
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 *
 * Fetches the remotes manifest and shell app-config with retry and caller-provided fallback.
 */

import type { RemoteConfig } from "@mfe-runtime/remote-config";
import { safeValidateRemoteConfig } from "@mfe-runtime/remote-config";
import { loadAppConfig, type AppConfig, LoadError } from "@mfe-runtime/app-config";

const DEFAULT_MANIFEST_URL = "/remotes.config.json";
const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function tryFetchManifest(url: string): Promise<RemoteConfig> {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  const valid = safeValidateRemoteConfig(raw);
  if (!valid) {
    throw new Error("Manifest failed schema validation");
  }
  return valid;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load the remotes manifest with retry and fallback.
 *
 * @param url - Manifest URL (defaults to "/remotes.config.json")
 * @param fallback - Fallback manifest to use if all retries fail
 * @returns The loaded or fallback manifest
 */
export async function loadManifest(
  url: string = DEFAULT_MANIFEST_URL,
  fallback: RemoteConfig,
): Promise<RemoteConfig> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await tryFetchManifest(url);
    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (import.meta.env?.DEV) {
        console.warn(
          `[shell-kit] Manifest fetch attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1} failed:`,
          error,
        );
      }
      if (isLastAttempt) {
        if (import.meta.env?.DEV) {
          console.warn(
            "[shell-kit] All manifest fetch attempts failed. Using fallback bundled configuration.",
          );
        }
        return fallback;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return fallback;
}

export interface ShellAppConfig {
  config: AppConfig;
  source: "remote" | "fallback";
}

/**
 * Load and validate the app config from a URL.
 *
 * @param url - Config URL (defaults to "/app-config.json")
 * @param devFallback - Optional fallback config for development mode
 * @param mode - Optional mode override for testing ('development' | 'production')
 * @throws {LoadError} In production, any error throws. In dev, only validation errors throw; fetch errors fall back.
 */
export async function loadShellAppConfig(
  url: string = "/app-config.json",
  devFallback?: AppConfig,
  mode: "development" | "production" = import.meta.env?.DEV ? "development" : "production",
): Promise<ShellAppConfig> {
  const isDev = mode === "development";

  try {
    const config = await loadAppConfig(url);
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
      if (devFallback) {
        console.warn(
          `[shell-kit] Failed to load ${url} in dev mode: ${error.message}. Using built-in fallback.`,
        );
        return { config: devFallback, source: "fallback" };
      }
      throw error;
    }

    // parse/validation errors throw even in dev
    throw error;
  }
}
