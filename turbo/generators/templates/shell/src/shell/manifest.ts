/**
 * Thin Shell — manifest fetching with retry and fallback.
 *
 * MVP Architecture:
 * - Fetches `/remotes.config.json` (served by the shell itself) with exponential backoff (1s, 2s, 4s)
 * - If network fetch fails, falls back to the bundled FALLBACK_REMOTES configuration
 * - This dual-layer approach ensures resilience: the shell can load even if serving the
 *   static config file temporarily fails
 *
 * Future: In production, the URL can point to an external config service, and the fallback
 * becomes a true bootstrap configuration.
 */

import type { RemoteConfig } from "@mfe-runtime/remote-config";
import { safeValidateRemoteConfig } from "@mfe-runtime/remote-config";
import { FALLBACK_REMOTES } from "../config/remotes.js";

const DEFAULT_URL = "/remotes.config.json";
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

function logAttemptFailure(attempt: number, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(
      `[shell] Manifest fetch attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1} failed:`,
      error,
    );
  }
}

function logFallback(): void {
  if (import.meta.env.DEV) {
    console.warn(
      "[shell] All manifest fetch attempts failed. Using fallback bundled configuration.",
    );
  }
}

export async function fetchManifest(url: string = DEFAULT_URL): Promise<RemoteConfig | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await tryFetchManifest(url);
    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      logAttemptFailure(attempt, error);
      if (isLastAttempt) {
        logFallback();
        return FALLBACK_REMOTES;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
