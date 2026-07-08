import type { RemoteConfig, Remote } from "@mf-mono/remote-config";
import { LoaderEvents } from "./events.js";
import { fetchConfig, type FetchConfigOptions } from "./config.js";
import type { LoaderStatus, Container } from "./types.js";

/**
 * Dynamic loader for Module Federation remotes
 */
export class DynamicLoader {
  private events = new LoaderEvents();
  private config: RemoteConfig | null = null;
  private loadedRemotes = new Map<string, Container>();
  private loadedScripts = new Set<string>();
  private initialized = false;

  /**
   * Check if running in browser environment
   */
  private checkEnvironment(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("DynamicLoader requires browser environment");
    }
  }

  /**
   * Initialize the loader by fetching and caching config
   */
  async init(options?: FetchConfigOptions): Promise<void> {
    this.checkEnvironment();

    // If already initialized, return cached config
    if (this.initialized && this.config) {
      return;
    }

    this.events.emit("config:fetch:start", undefined);

    try {
      this.config = await fetchConfig(options);
      this.initialized = true;
      this.events.emit("config:fetch:success", { config: this.config });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit("config:fetch:error", { error: err });
      throw err;
    }
  }

  /**
   * Load a remote by name
   */
  async loadRemote(name: string): Promise<Container> {
    this.checkEnvironment();

    // Ensure initialized
    if (!this.config) {
      throw new Error("Loader not initialized. Call init() first.");
    }

    // Check if already loaded
    if (this.loadedRemotes.has(name)) {
      return this.loadedRemotes.get(name)!;
    }

    this.events.emit("remote:load:start", { name });

    try {
      // Find remote in config
      const remote = this.config.remotes.find((r) => r.name === name);
      if (!remote) {
        throw new Error(`Remote '${name}' not found in config`);
      }

      // Check if enabled
      if (remote.enabled === false) {
        throw new Error(`Remote '${name}' is disabled`);
      }

      // Load the remote script
      await this.loadScript(remote.entryUrl);

      // Get the container
      const scope = remote.scope || name;
      const container = (window as any)[scope] as Container | undefined;

      if (!container) {
        throw new Error(`Remote '${name}' container not found at window.${scope}`);
      }

      // Initialize Module Federation sharing
      await this.initializeSharing(container);

      // Cache the container
      this.loadedRemotes.set(name, container);

      this.events.emit("remote:load:success", { name, container });

      return container;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit("remote:load:error", { name, error: err });
      throw err;
    }
  }

  /**
   * Preload a remote without initializing it
   */
  async preload(name: string): Promise<void> {
    this.checkEnvironment();

    // Ensure config is loaded
    if (!this.config) {
      await this.init();
    }

    // Find remote
    const remote = this.config!.remotes.find((r) => r.name === name);
    if (!remote) {
      throw new Error(`Remote '${name}' not found in config`);
    }

    // Just load the script, don't initialize
    await this.loadScript(remote.entryUrl);

    this.events.emit("remote:preload:success", { name });
  }

  /**
   * Get current loader status
   */
  getStatus(): LoaderStatus {
    return {
      initialized: this.initialized,
      configLoaded: this.config !== null,
      remotesLoaded: Array.from(this.loadedRemotes.keys()),
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.config = null;
    this.loadedRemotes.clear();
    this.loadedScripts.clear();
    this.initialized = false;
  }

  /**
   * Register an event listener
   */
  on = this.events.on.bind(this.events);

  /**
   * Remove an event listener
   */
  off = this.events.off.bind(this.events);

  /**
   * Load a script tag dynamically
   */
  private async loadScript(url: string): Promise<void> {
    // Skip if already loaded
    if (this.loadedScripts.has(url)) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.type = "text/javascript";
      script.async = true;

      script.onload = () => {
        this.loadedScripts.add(url);
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Failed to load script from ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Module Federation sharing
   */
  private async initializeSharing(container: Container): Promise<void> {
    // Initialize webpack sharing if available
    if (typeof __webpack_init_sharing__ !== "undefined") {
      await __webpack_init_sharing__("default");
    }

    // Initialize the container
    if (typeof __webpack_share_scopes__ !== "undefined") {
      await container.init(__webpack_share_scopes__.default);
    } else {
      await container.init({});
    }
  }
}
