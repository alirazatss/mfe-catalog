/**
 * Thin Shell — manifest fetching with retry.
 *
 * Fetches `/remotes.config.json` with exponential backoff (1s, 2s, 4s).
 * Returns null on total failure — the caller decides how to surface it
 * (typically renderCriticalError).
 *
 * The 24-hour localStorage cache fallback is added in the
 * `graceful-failure-boundaries` change; for now, this is a pure network fetch.
 */

import type { RemoteConfig } from "@mf-mono/remote-config";
import { safeValidateRemoteConfig } from "@mf-mono/remote-config";

const DEFAULT_URL = "/remotes.config.json";
const RETRY_DELAYS_MS = [1000, 2000, 4000];

export async function fetchManifest(url: string = DEFAULT_URL): Promise<RemoteConfig | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const raw = (await response.json()) as unknown;
      const valid = safeValidateRemoteConfig(raw);
      if (!valid) {
        throw new Error("Manifest failed schema validation");
      }
      return valid;
    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (import.meta.env.DEV) {
        console.warn(
          `[shell] Manifest fetch attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1} failed:`,
          error,
        );
      }
      if (isLastAttempt) return null;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
