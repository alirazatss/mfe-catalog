/**
 * Dynamic Remote Loader Initialization
 *
 * Initializes the dynamic loader to fetch and load micro-frontends
 * from the auto-generated remotes.config.json file.
 */

import { loader } from "@mf-mono/dynamic-loader";

/**
 * Initialize the dynamic loader
 *
 * This should be called once at app startup before rendering components.
 * It fetches the generated config and caches it in memory.
 */
export async function initializeRemotes(): Promise<void> {
  try {
    await loader.init({
      configPath: "/remotes.config.json",
      maxRetries: 2,
      retryDelay: 1000,
    });

    if (import.meta.env.DEV) {
      console.log("[Remotes] Dynamic loader initialized successfully");
    }
  } catch (error) {
    console.error("[Remotes] Failed to initialize dynamic loader:", error);
    // App can still run - error will be caught when trying to load remotes
  }
}

/**
 * Setup event listeners for development debugging
 */
if (import.meta.env.DEV) {
  loader.on("config:fetch:success", ({ config }: { config: any }) => {
    console.log("[Remotes] Config loaded:", config);
  });

  loader.on("config:fetch:error", ({ error }: { error: any }) => {
    console.error("[Remotes] Config fetch error:", error);
  });

  loader.on("remote:load:start", ({ name }: { name: string }) => {
    console.log(`[Remotes] Loading remote '${name}'...`);
  });

  loader.on("remote:load:success", ({ name }: { name: string }) => {
    console.log(`[Remotes] Remote '${name}' loaded successfully`);
  });

  loader.on("remote:load:error", ({ name, error }: { name: string; error: any }) => {
    console.error(`[Remotes] Failed to load remote '${name}':`, error);
  });

  loader.on("remote:preload:success", ({ name }: { name: string }) => {
    console.log(`[Remotes] Remote '${name}' preloaded`);
  });
}

/**
 * Export the loader instance for use in components
 */
export { loader };

/**
 * Get current loader status (useful for debugging)
 */
export function getLoaderStatus() {
  return loader.getStatus();
}
