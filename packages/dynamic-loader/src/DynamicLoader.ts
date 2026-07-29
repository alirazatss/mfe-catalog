import type { RemoteConfig, ChromeMFE, FeatureMFE, LegacyRemote } from "@mfe-runtime/remote-config";
import { LoaderEvents } from "./events.js";
import { fetchConfig, type FetchConfigOptions } from "./config.js";
import type { LoaderStatus, Container } from "./types.js";

/**
 * A resolved MFE descriptor produced by the loader when looking up an MFE by name.
 * Normalizes the difference between chrome MFEs, feature MFEs, and legacy remotes.
 */
export interface ResolvedMFE {
  name: string;
  entryUrl: string;
  scope: string;
  version?: string;
  enabled: boolean;
  /** Original source: which section of the manifest this MFE came from */
  source: "chrome" | "feature" | "legacy";
  /** For chrome MFEs, the slot this MFE is registered under */
  slot?: string;
  /** For feature MFEs, the URL prefix that maps to this MFE */
  routePrefix?: string;
  /** For feature MFEs */
  requiresAuth?: boolean;
  requiredRoles?: string[];
  basePath?: string;
  /** Free-form MFE-specific config from the manifest */
  config?: Record<string, unknown>;
}

/**
 * Dynamic loader for Module Federation remotes.
 *
 * v2 supports the chrome+features manifest shape from ADR-0004, in addition to the
 * legacy `remotes` array. See openspec/changes/refactor-to-thin-shell/.
 */
export class DynamicLoader {
  private events = new LoaderEvents();
  private config: RemoteConfig | null = null;
  private loadedRemotes = new Map<string, Container>();
  private loadedScripts = new Map<string, Container | null>();
  private initialized = false;
  /** Tracks which slot currently hosts which MFE (best-effort bookkeeping) */
  private slotOccupancy = new Map<string, string>();

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
   * Set the manifest programmatically (used by shells that fetch the manifest themselves).
   */
  setConfig(config: RemoteConfig): void {
    this.config = config;
    this.initialized = true;
  }

  /**
   * Resolve an MFE by name across chrome, features, and legacy remotes.
   *
   * Returns null if the MFE is not found. Callers decide how to surface the
   * missing-MFE case (typically slot-level error UI).
   */
  resolveMFE(name: string): ResolvedMFE | null {
    if (!this.config) return null;

    // Chrome MFEs (keyed by slot name)
    if (this.config.chrome) {
      for (const [slot, entry] of Object.entries(this.config.chrome)) {
        if (entry.mfe === name) {
          return this.normalizeChrome(entry, slot);
        }
      }
    }

    // Feature MFEs (keyed by route prefix)
    if (this.config.features) {
      for (const [prefix, entry] of Object.entries(this.config.features)) {
        if (entry.mfe === name) {
          return this.normalizeFeature(entry, prefix);
        }
      }
    }

    // Legacy remotes array
    if (this.config.remotes) {
      const legacy = this.config.remotes.find((r) => r.name === name);
      if (legacy) return this.normalizeLegacy(legacy);
    }

    return null;
  }

  /**
   * List all chrome MFEs for iterative mounting during bootstrap.
   * Returns an array of `[slot, resolved]` tuples in insertion order.
   */
  listChromeMFEs(): Array<[string, ResolvedMFE]> {
    if (!this.config?.chrome) return [];
    return Object.entries(this.config.chrome).map(([slot, entry]) => [
      slot,
      this.normalizeChrome(entry, slot),
    ]);
  }

  /**
   * Match a URL pathname to a feature MFE using longest-prefix wins.
   * Returns null if no feature matches.
   */
  matchRoute(pathname: string): ResolvedMFE | null {
    if (!this.config?.features) return null;

    const prefixes = Object.keys(this.config.features).sort((a, b) => b.length - a.length);
    for (const prefix of prefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        const entry = this.config.features[prefix];
        return this.normalizeFeature(entry, prefix);
      }
    }
    return null;
  }

  /**
   * Load a remote's Module Federation container by name.
   * Does NOT mount the MFE — callers are responsible for driving the lifecycle
   * once the container is available. See mfe-lifecycle-contract change for the
   * upcoming lifecycle-aware `load(name, slotId, props)` API.
   *
   * If `slotId` is provided, the loader records the slot->name mapping for
   * bookkeeping.
   */
  async loadRemote(name: string, slotId?: string): Promise<Container> {
    this.checkEnvironment();

    if (!this.config) {
      throw new Error("Loader not initialized. Call init() or setConfig() first.");
    }

    if (this.loadedRemotes.has(name)) {
      if (slotId) this.slotOccupancy.set(slotId, name);
      return this.loadedRemotes.get(name)!;
    }

    this.events.emit("remote:load:start", { name });

    try {
      const resolved = this.resolveMFE(name);
      if (!resolved) {
        throw new Error(`Remote '${name}' not found in manifest`);
      }

      if (!resolved.enabled) {
        throw new Error(`Remote '${name}' is disabled`);
      }

      const importedContainer = await this.loadScript(resolved.entryUrl);

      const container =
        importedContainer ?? ((window as any)[resolved.scope] as Container | undefined);
      if (!container) {
        throw new Error(`Remote '${name}' container not found at window.${resolved.scope}`);
      }

      await this.initializeSharing(container);

      this.loadedRemotes.set(name, container);
      if (slotId) this.slotOccupancy.set(slotId, name);

      this.events.emit("remote:load:success", { name, container });
      return container;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.events.emit("remote:load:error", { name, error: err });
      throw err;
    }
  }

  /**
   * Return the MFE name currently occupying a slot (best effort bookkeeping).
   */
  getSlotOccupant(slotId: string): string | null {
    return this.slotOccupancy.get(slotId) ?? null;
  }

  /**
   * Clear the slot occupancy record for a slot. Callers that unmount an MFE
   * should call this so the next `loadRemote(_, slotId)` knows the slot is free.
   */
  clearSlot(slotId: string): void {
    this.slotOccupancy.delete(slotId);
  }

  /**
   * Preload a remote without initializing it
   */
  async preload(name: string): Promise<void> {
    this.checkEnvironment();

    if (!this.config) {
      await this.init();
    }

    const resolved = this.resolveMFE(name);
    if (!resolved) {
      throw new Error(`Remote '${name}' not found in manifest`);
    }

    await this.loadScript(resolved.entryUrl);
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
    this.slotOccupancy.clear();
    this.initialized = false;
  }

  /** Register an event listener */
  on = this.events.on.bind(this.events);

  /** Remove an event listener */
  off = this.events.off.bind(this.events);

  // ------------------------------------------------------------------
  // Normalization helpers
  // ------------------------------------------------------------------

  private normalizeChrome(entry: ChromeMFE, slot: string): ResolvedMFE {
    return {
      name: entry.mfe,
      entryUrl: entry.entryUrl,
      scope: entry.scope ?? entry.mfe,
      version: entry.version,
      enabled: entry.enabled !== false,
      source: "chrome",
      slot,
      config: entry.config,
    };
  }

  private normalizeFeature(entry: FeatureMFE, routePrefix: string): ResolvedMFE {
    return {
      name: entry.mfe,
      entryUrl: entry.entryUrl,
      scope: entry.scope ?? entry.mfe,
      version: entry.version,
      enabled: entry.enabled !== false,
      source: "feature",
      routePrefix,
      // Secure by default: missing `requiresAuth` = protected
      requiresAuth: entry.requiresAuth ?? true,
      requiredRoles: entry.requiredRoles ?? [],
      basePath: entry.basePath ?? routePrefix,
      config: entry.config,
    };
  }

  private normalizeLegacy(entry: LegacyRemote): ResolvedMFE {
    return {
      name: entry.name,
      entryUrl: entry.entryUrl,
      scope: entry.scope,
      version: entry.version,
      enabled: entry.enabled !== false,
      source: "legacy",
    };
  }

  private async loadScript(url: string): Promise<Container | undefined> {
    if (this.loadedScripts.has(url)) {
      return this.loadedScripts.get(url) ?? undefined;
    }

    try {
      const remoteModule = await import(/* @vite-ignore */ url);
      const container =
        typeof remoteModule.init === "function" && typeof remoteModule.get === "function"
          ? (remoteModule as Container)
          : undefined;

      this.loadedScripts.set(url, container ?? null);
      return container;
    } catch (error) {
      throw new Error(
        `Failed to load script from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async initializeSharing(container: Container): Promise<void> {
    if (typeof __webpack_init_sharing__ !== "undefined") {
      await __webpack_init_sharing__("default");
    }

    if (typeof __webpack_share_scopes__ !== "undefined") {
      await container.init(__webpack_share_scopes__.default);
    } else {
      await container.init({});
    }
  }
}
