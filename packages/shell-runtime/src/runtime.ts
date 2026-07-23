import { DynamicLoader, type ResolvedMFE } from "@mfe-runtine/dynamic-loader";
import { safeValidateRemoteConfig, type RemoteConfig } from "@mfe-runtine/remote-config";
import type {
  FailureScope,
  ShellRuntime,
  ShellRuntimeConfig,
  ShellRuntimeFailure,
  ShellRuntimeObserverEvent,
  ShellRuntimeState,
} from "./contracts.js";
import { LifecycleController, type RuntimeAuthSnapshot } from "./lifecycle-controller.js";

type RouteDecision =
  | { outcome: "allow"; feature: ResolvedMFE }
  | { outcome: "unauthenticated" | "forbidden" | "not-found" };

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown shell runtime error");
}

function cloneState(state: ShellRuntimeState): ShellRuntimeState {
  return {
    kind: state.kind,
    activeUrl: state.activeUrl,
    activeFeature: state.activeFeature,
    activeChrome: { ...state.activeChrome },
    pendingNavigation: state.pendingNavigation,
  };
}

function validateConfig<User>(
  config: ShellRuntimeConfig<User> | undefined,
): ShellRuntimeConfig<User> {
  if (!config) {
    throw new Error("Shell Runtime requires a manifest provider");
  }
  if (!config.manifest || typeof config.manifest.load !== "function") {
    throw new Error("Shell Runtime requires a manifest provider");
  }
  if (
    !config.auth ||
    typeof config.auth.isAuthenticated !== "function" ||
    typeof config.auth.getUser !== "function"
  ) {
    throw new Error("Shell Runtime requires an auth adapter");
  }
  if (
    !config.navigation ||
    typeof config.navigation.currentUrl !== "function" ||
    typeof config.navigation.subscribe !== "function" ||
    typeof config.navigation.navigate !== "function"
  ) {
    throw new Error("Shell Runtime requires a navigation adapter");
  }
  if (typeof config.resolveSlot !== "function") {
    throw new TypeError("Shell Runtime requires a slot resolver");
  }
  if (
    !config.renderer ||
    typeof config.renderer.render !== "function" ||
    typeof config.renderer.clear !== "function"
  ) {
    throw new Error("Shell Runtime requires a failure renderer");
  }
  return config;
}

class ShellRuntimeImpl<User = unknown> implements ShellRuntime {
  private readonly config: ShellRuntimeConfig<User>;
  private readonly loader: DynamicLoader;
  private readonly state: ShellRuntimeState = {
    kind: "idle",
    activeUrl: null,
    activeFeature: null,
    activeChrome: {},
    pendingNavigation: null,
  };
  private readonly lifecycleController: LifecycleController;
  private startPromise: Promise<void> | null = null;
  private stopPromise: Promise<void> | null = null;
  private navigationUnsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private sharedPropsUnsubscribe: (() => void) | null = null;
  private operationEpoch = 0;
  private routeRevision = 0;
  private processedRouteRevision = 0;
  private routeProcessing: Promise<void> | null = null;
  private latestUrl: URL | null = null;
  private manifest: RemoteConfig | null = null;

  constructor(config: ShellRuntimeConfig<User>) {
    this.config = validateConfig(config);
    this.loader = config.loader ?? new DynamicLoader();
    this.lifecycleController = new LifecycleController({
      loader: this.loader,
      resolveSlot: config.resolveSlot,
      renderFailure: async (failure) => this.renderFailure(failure),
      clearFailure: async (scope) => this.clearFailure(scope),
      emitObserver: (event) => this.emitObserver(event),
      getAuthSnapshot: () => this.getAuthSnapshot(),
      getSharedProps: () => this.config.getSharedProps?.() ?? {},
      navigate: (path, options) => this.config.navigation.navigate(path, options),
      getCurrentUrl: () =>
        this.latestUrl
          ? `${this.latestUrl.pathname}${this.latestUrl.search}${this.latestUrl.hash}`
          : undefined,
    });
  }

  getState(): ShellRuntimeState {
    return cloneState(this.state);
  }

  async start(): Promise<void> {
    if (this.state.kind === "disposed") {
      throw new Error("Shell Runtime instance has been disposed");
    }
    if (this.state.kind === "started") {
      return;
    }
    if (this.startPromise !== null) {
      return this.startPromise;
    }

    this.state.kind = "starting";
    this.emitState();
    const epoch = ++this.operationEpoch;

    this.startPromise = (async () => {
      this.assertBrowserEnvironment();
      this.loader.clearCache();
      this.manifest = await this.loadManifest();
      this.loader.setConfig(this.manifest);

      try {
        await this.config.auth.initialize?.();
      } catch (error) {
        await this.renderFailure({
          phase: "auth",
          scope: { kind: "critical" },
          error: toError(error),
          severity: "warning",
        });
      }

      const chromeEntries = this.loader.listChromeMFEs().filter(([, resolved]) => resolved.enabled);
      await Promise.allSettled(
        chromeEntries.map(([slot, resolved]) => this.lifecycleController.activate(resolved, slot)),
      );
      this.syncStateFromLifecycle();

      this.latestUrl = this.config.navigation.currentUrl();
      this.state.activeUrl = `${this.latestUrl.pathname}${this.latestUrl.search}${this.latestUrl.hash}`;
      this.routeRevision += 1;
      this.state.pendingNavigation = this.state.activeUrl;
      await this.processRoutes(epoch);

      if (epoch !== this.operationEpoch) {
        return;
      }

      this.navigationUnsubscribe = this.config.navigation.subscribe((url) => {
        this.latestUrl = url;
        this.state.activeUrl = `${url.pathname}${url.search}${url.hash}`;
        this.state.pendingNavigation = this.state.activeUrl;
        this.routeRevision += 1;
        this.emitState();
        void this.processRoutes(this.operationEpoch);
      });
      this.authUnsubscribe =
        this.config.auth.subscribe?.(() => {
          void this.lifecycleController.refreshMounted();
        }) ?? null;
      const sharedCleanup = this.config.subscribeSharedProps?.(() => {
        void this.lifecycleController.refreshMounted();
      });
      this.sharedPropsUnsubscribe = typeof sharedCleanup === "function" ? sharedCleanup : null;

      this.state.kind = "started";
      this.syncStateFromLifecycle();
      this.state.pendingNavigation = null;
      this.emitState();
    })().finally(() => {
      this.startPromise = null;
      if (this.state.kind === "starting") {
        this.state.kind = "idle";
        this.emitState();
      }
    });

    return this.startPromise;
  }

  async stop(): Promise<void> {
    if (this.state.kind === "disposed") {
      return;
    }
    if (this.state.kind === "idle" || this.state.kind === "stopped") {
      this.state.kind = "stopped";
      this.emitState();
      return;
    }
    if (this.stopPromise !== null) {
      return this.stopPromise;
    }

    this.state.kind = "stopping";
    this.state.pendingNavigation = null;
    this.emitState();
    ++this.operationEpoch;

    this.stopPromise = (async () => {
      this.navigationUnsubscribe?.();
      this.authUnsubscribe?.();
      this.sharedPropsUnsubscribe?.();
      this.navigationUnsubscribe = null;
      this.authUnsubscribe = null;
      this.sharedPropsUnsubscribe = null;

      await this.lifecycleController.unmountAll();
      this.syncStateFromLifecycle();
      this.state.kind = "stopped";
      this.state.pendingNavigation = null;
      this.emitState();
    })().finally(() => {
      this.stopPromise = null;
    });

    return this.stopPromise;
  }

  async dispose(): Promise<void> {
    if (this.state.kind === "disposed") {
      return;
    }
    this.state.kind = "disposing";
    this.emitState();
    await this.stop();
    ++this.operationEpoch;
    this.state.kind = "disposed";
    this.state.activeUrl = null;
    this.state.pendingNavigation = null;
    this.emitState();
  }

  private assertBrowserEnvironment(): void {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new TypeError("Shell Runtime requires a browser environment");
    }
  }

  private async loadManifest(): Promise<RemoteConfig> {
    const loaded = await this.config.manifest.load();
    const manifest = safeValidateRemoteConfig(loaded);
    if (!manifest) {
      const error = new Error("Manifest failed schema validation");
      await this.renderFailure({
        phase: "manifest",
        scope: { kind: "critical" },
        error,
        severity: "error",
      });
      throw error;
    }
    this.emitObserver({ type: "runtime:manifest", manifest });
    return manifest;
  }

  private async processRoutes(epoch: number): Promise<void> {
    if (this.routeProcessing !== null) {
      return this.routeProcessing;
    }

    this.routeProcessing = (async () => {
      while (this.processedRouteRevision < this.routeRevision) {
        const revision = this.routeRevision;
        const url = this.latestUrl;
        if (!url) {
          this.processedRouteRevision = revision;
          continue;
        }
        await this.processRoute(url, revision, epoch);
        this.processedRouteRevision = revision;
      }
    })().finally(() => {
      this.routeProcessing = null;
    });

    return this.routeProcessing;
  }

  private async processRoute(url: URL, revision: number, epoch: number): Promise<void> {
    const decision = this.evaluateRoute(url);
    this.emitObserver({
      type: "runtime:route",
      url: `${url.pathname}${url.search}${url.hash}`,
      outcome: decision.outcome,
      feature: decision.outcome === "allow" ? decision.feature : undefined,
    });

    if (decision.outcome !== "allow") {
      await this.lifecycleController.unmountSlot("main");
      this.syncStateFromLifecycle();
      await this.renderRouteOutcome(decision, url);
      return;
    }

    await this.clearFailure({ kind: "route" });

    const currentFeature = this.lifecycleController.getActiveFeature();
    if (currentFeature === decision.feature.name) {
      await this.lifecycleController.updateFeatureIfActive(decision.feature);
      this.syncStateFromLifecycle();
      return;
    }

    await this.lifecycleController.unmountSlot("main");
    await this.lifecycleController.activate(decision.feature, "main");
    if (epoch !== this.operationEpoch || revision !== this.routeRevision) {
      await this.lifecycleController.cleanupStaleFeature(decision.feature.name);
      this.syncStateFromLifecycle();
      return;
    }
    this.syncStateFromLifecycle();
  }

  private evaluateRoute(url: URL): RouteDecision {
    const feature = this.loader.matchRoute(url.pathname);
    if (!feature?.enabled) {
      return { outcome: "not-found" };
    }

    const auth = this.getAuthSnapshot();
    if (feature.requiresAuth !== false && !auth.isAuthenticated) {
      return { outcome: "unauthenticated" };
    }

    if ((feature.requiredRoles ?? []).length > 0) {
      const roles = auth.roles ?? [];
      const allowed = (feature.requiredRoles ?? []).some((role) => roles.includes(role));
      if (!allowed) {
        return { outcome: "forbidden" };
      }
    }

    return { outcome: "allow", feature };
  }

  private async renderRouteOutcome(
    decision: Exclude<RouteDecision, { outcome: "allow" }>,
    url: URL,
  ): Promise<void> {
    const messageByOutcome = {
      unauthenticated: new Error(`Route requires authentication: ${url.pathname}`),
      forbidden: new Error(`Route requires additional roles: ${url.pathname}`),
      "not-found": new Error(`No feature matched route: ${url.pathname}`),
    } as const;

    await this.renderFailure({
      phase: "route",
      scope: { kind: "route" },
      error: messageByOutcome[decision.outcome],
      severity: decision.outcome === "not-found" ? "warning" : "error",
      url: `${url.pathname}${url.search}${url.hash}`,
      route: decision.outcome,
    });
  }

  private getAuthSnapshot(): RuntimeAuthSnapshot {
    return {
      isAuthenticated: this.config.auth.isAuthenticated(),
      user: this.config.auth.getUser(),
      roles: this.config.auth.getRoles?.() ?? [],
    };
  }

  private syncStateFromLifecycle(): void {
    this.state.activeChrome = this.lifecycleController.getActiveChrome();
    this.state.activeFeature = this.lifecycleController.getActiveFeature();
  }

  private emitState(): void {
    this.emitObserver({ type: "runtime:state", state: this.getState() });
  }

  private emitObserver(event: ShellRuntimeObserverEvent): void {
    try {
      this.config.observe?.(event);
    } catch (error) {
      if (event.type !== "runtime:failure") {
        void this.renderFailure(
          {
            phase: "renderer",
            scope: { kind: "critical" },
            error: toError(error),
            severity: "warning",
          },
          false,
        );
      }
    }
  }

  private async renderFailure(failure: ShellRuntimeFailure, allowRenderer = true): Promise<void> {
    this.emitObserver({ type: "runtime:failure", failure });
    if (!allowRenderer) {
      return;
    }
    try {
      await this.config.renderer.render(failure);
    } catch (error) {
      this.emitObserver({
        type: "runtime:failure",
        failure: {
          phase: "renderer",
          scope: failure.scope,
          error: toError(error),
          severity: "warning",
        },
      });
    }
  }

  private async clearFailure(scope: FailureScope): Promise<void> {
    try {
      await this.config.renderer.clear(scope);
      this.emitObserver({ type: "runtime:recovery", scope });
    } catch (error) {
      this.emitObserver({
        type: "runtime:failure",
        failure: {
          phase: "renderer",
          scope,
          error: toError(error),
          severity: "warning",
        },
      });
    }
  }
}

export function createShellRuntime<User = unknown>(config: ShellRuntimeConfig<User>): ShellRuntime {
  return new ShellRuntimeImpl(config);
}
