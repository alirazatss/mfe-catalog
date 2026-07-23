import { validateRemoteConfig } from "@mfe-runtine/remote-config";
import type { RemoteConfig } from "@mfe-runtine/remote-config";

/**
 * Config fetch options
 */
export interface FetchConfigOptions {
  /** Config file path (default: /remotes.config.json) */
  configPath?: string;
  /** Maximum retry attempts (default: 2) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

/**
 * Fetch and validate remote config with retry logic
 */
export async function fetchConfig(options: FetchConfigOptions = {}): Promise<RemoteConfig> {
  const { configPath = "/remotes.config.json", maxRetries = 2, retryDelay = 1000 } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(configPath);

      if (!response.ok) {
        throw new Error(`Failed to fetch config from ${configPath}: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Validate against JSON Schema (throws if invalid)
      validateRemoteConfig(data);

      return data as RemoteConfig;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we've exhausted retries, throw
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Config fetch failed");
}
