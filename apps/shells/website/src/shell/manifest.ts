/**
 * Thin Shell — manifest fetching with retry, fail-visible approach.
 *
 * Implements TSB-1: shell has no baked-in fallback remotes; manifest fetch failure propagates
 * See openspec/changes/remote-config-environment-cleanup/specs/thin-shell-bootstrap/spec.md
 *
 * Architecture:
 * - Fetches `/remotes.config.json` (served by the shell itself) with exponential backoff (1s, 2s, 4s)
 * - If all fetch attempts fail, rejects with error — no fallback
 * - Bootstrap failure renders critical-error UI (no MFE mounts)
 * - This ensures fetch failures are visible immediately, not masked by stale fallback config
 */

import type { RemoteConfig } from "@mfe-runtime/remote-config";
import { safeValidateRemoteConfig } from "@mfe-runtime/remote-config";

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

function logFinalFailure(error: unknown): void {
  console.error(
    "[shell] All manifest fetch attempts failed. Cannot bootstrap shell without remote config.",
    error,
  );
}

export async function fetchManifest(url: string = DEFAULT_URL): Promise<RemoteConfig> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await tryFetchManifest(url);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      logAttemptFailure(attempt, error);
      if (isLastAttempt) {
        logFinalFailure(error);
        throw new Error(
          `Failed to fetch manifest after ${RETRY_DELAYS_MS.length + 1} attempts: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error(`Failed to fetch manifest: ${lastError}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
