import { safeValidateRemoteConfig, type RemoteConfig } from "@mfe-runtine/remote-config";
import type { ManifestProvider } from "./contracts.js";

export interface UrlManifestProviderOptions {
  url?: string;
  fetch?: typeof globalThis.fetch;
  retryDelaysMs?: number[];
  cache?: RequestCache;
  shouldRetry?: (response: Response | null, error: unknown) => boolean;
}

function defaultShouldRetry(response: Response | null): boolean {
  return response ? response.status >= 500 : true;
}

export function createUrlManifestProvider(
  options: UrlManifestProviderOptions = {},
): ManifestProvider {
  const {
    url = "/remotes.config.json",
    fetch: fetchImpl,
    retryDelaysMs = [1000, 2000],
    cache = "no-cache",
    shouldRetry = defaultShouldRetry,
  } = options;

  return {
    async load(): Promise<RemoteConfig> {
      const activeFetch = fetchImpl ?? globalThis.fetch;
      if (typeof activeFetch !== "function") {
        throw new Error("No fetch implementation available for manifest loading");
      }

      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
        let response: Response | null = null;
        try {
          response = await activeFetch(url, { cache });
          if (!response.ok) {
            throw new Error(`Manifest request failed with HTTP ${response.status}`);
          }
          const json = (await response.json()) as unknown;
          const manifest = safeValidateRemoteConfig(json);
          if (!manifest) {
            throw new Error("Manifest failed schema validation");
          }
          return manifest;
        } catch (error) {
          const isLastAttempt = attempt === retryDelaysMs.length;
          if (isLastAttempt || !shouldRetry(response, error)) {
            throw error instanceof Error ? error : new Error(String(error));
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
        }
      }

      throw new Error("Manifest loading exhausted retries");
    },
  };
}
