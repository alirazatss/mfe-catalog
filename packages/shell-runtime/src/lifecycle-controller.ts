import type {
  Container,
  DynamicLoader,
  MFELifecycle,
  MFEProps,
  ResolvedMFE,
} from "@mfe-runtine/dynamic-loader";
import type { FailureScope, ShellRuntimeFailure, ShellRuntimeObserverEvent } from "./contracts.js";

export interface RuntimeAuthSnapshot {
  isAuthenticated: boolean;
  user: unknown;
  roles: readonly string[];
}

export interface LifecycleControllerOptions {
  loader: DynamicLoader;
  resolveSlot: (slot: string) => HTMLElement | null;
  renderFailure: (failure: ShellRuntimeFailure) => Promise<void>;
  clearFailure: (scope: FailureScope) => Promise<void>;
  emitObserver: (event: ShellRuntimeObserverEvent) => void;
  getAuthSnapshot: () => RuntimeAuthSnapshot;
  getSharedProps: () => Record<string, unknown>;
  navigate: (
    path: string,
    options?: { replace?: boolean; state?: unknown },
  ) => void | Promise<void>;
  getCurrentUrl: () => string | undefined;
}

interface MountedInstance {
  resolved: ResolvedMFE;
  slot: string;
  element: HTMLElement;
  lifecycle: MFELifecycle;
  props: MFEProps;
  identity: string;
}

function toScope(slot: string): FailureScope {
  return slot === "main" ? { kind: "route" } : { kind: "slot", slot };
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown shell runtime error");
}

export class LifecycleController {
  private readonly mountedSlots = new Map<string, MountedInstance>();
  private readonly bootstrappedIdentities = new Set<string>();

  constructor(private readonly options: LifecycleControllerOptions) {}

  getActiveFeature(): string | null {
    return this.mountedSlots.get("main")?.resolved.name ?? null;
  }

  getActiveChrome(): Record<string, string> {
    const chrome: Record<string, string> = {};
    for (const [slot, instance] of this.mountedSlots.entries()) {
      if (slot !== "main") {
        chrome[slot] = instance.resolved.name;
      }
    }
    return chrome;
  }

  async activate(resolved: ResolvedMFE, slot: string): Promise<void> {
    const element = this.options.resolveSlot(slot);
    if (!element) {
      await this.options.renderFailure({
        phase: "slot",
        scope: toScope(slot),
        error: new Error(`Slot '${slot}' could not be resolved`),
        mfeName: resolved.name,
        slot,
        severity: "error",
        url: this.options.getCurrentUrl(),
      });
      return;
    }

    const current = this.mountedSlots.get(slot);
    if (current && current.resolved.name !== resolved.name) {
      await this.unmountSlot(slot);
    }

    const lifecycle = await this.loadLifecycle(resolved, slot);
    const identity = this.getIdentity(resolved);
    const props = this.buildProps(resolved, slot, element);

    if (!this.bootstrappedIdentities.has(identity) && lifecycle.bootstrap) {
      this.options.emitObserver({
        type: "runtime:lifecycle",
        mfeName: resolved.name,
        slot,
        action: "bootstrap",
        url: this.options.getCurrentUrl(),
      });
      await lifecycle.bootstrap(props);
      this.bootstrappedIdentities.add(identity);
    }

    this.options.emitObserver({
      type: "runtime:lifecycle",
      mfeName: resolved.name,
      slot,
      action: "mount",
      url: this.options.getCurrentUrl(),
    });
    await lifecycle.mount(props);

    this.mountedSlots.set(slot, { resolved, slot, element, lifecycle, props, identity });
    await this.options.clearFailure(toScope(slot));
  }

  async refreshMounted(): Promise<void> {
    const entries = Array.from(this.mountedSlots.entries());
    for (const [slot, instance] of entries) {
      const props = this.buildProps(instance.resolved, slot, instance.element);
      instance.props = props;
      if (instance.lifecycle.update) {
        this.options.emitObserver({
          type: "runtime:lifecycle",
          mfeName: instance.resolved.name,
          slot,
          action: "update",
          url: this.options.getCurrentUrl(),
        });
        await instance.lifecycle.update(props);
        continue;
      }

      this.options.emitObserver({
        type: "runtime:lifecycle",
        mfeName: instance.resolved.name,
        slot,
        action: "unmount",
        url: this.options.getCurrentUrl(),
      });
      await instance.lifecycle.unmount(instance.props);
      this.options.emitObserver({
        type: "runtime:lifecycle",
        mfeName: instance.resolved.name,
        slot,
        action: "mount",
        url: this.options.getCurrentUrl(),
      });
      await instance.lifecycle.mount(props);
      instance.props = props;
    }
  }

  async updateFeatureIfActive(resolved: ResolvedMFE): Promise<void> {
    const current = this.mountedSlots.get("main");
    if (current?.resolved.name !== resolved.name) {
      return;
    }

    const props = this.buildProps(resolved, "main", current.element);
    current.props = props;
    current.resolved = resolved;
    if (current.lifecycle.update) {
      this.options.emitObserver({
        type: "runtime:lifecycle",
        mfeName: current.resolved.name,
        slot: "main",
        action: "update",
        url: this.options.getCurrentUrl(),
      });
      await current.lifecycle.update(props);
    }
  }

  async unmountSlot(slot: string): Promise<void> {
    const current = this.mountedSlots.get(slot);
    if (!current) {
      return;
    }

    try {
      this.options.emitObserver({
        type: "runtime:lifecycle",
        mfeName: current.resolved.name,
        slot,
        action: "unmount",
        url: this.options.getCurrentUrl(),
      });
      await current.lifecycle.unmount(current.props);
    } finally {
      current.element.innerHTML = "";
      this.options.loader.clearSlot(slot);
      this.mountedSlots.delete(slot);
    }
  }

  async unmountAll(): Promise<void> {
    const slots = Array.from(this.mountedSlots.keys());
    const results = await Promise.allSettled(slots.map((slot) => this.unmountSlot(slot)));
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        const slot = slots[index];
        await this.options.renderFailure({
          phase: "cleanup",
          scope: toScope(slot),
          error: toError(result.reason),
          slot,
          severity: "error",
          url: this.options.getCurrentUrl(),
        });
      }
    }
  }

  async cleanupStaleFeature(expectedName: string): Promise<void> {
    const current = this.mountedSlots.get("main");
    if (current?.resolved.name === expectedName) {
      await this.unmountSlot("main");
    }
  }

  private async loadLifecycle(resolved: ResolvedMFE, slot: string): Promise<MFELifecycle> {
    try {
      const container = await this.options.loader.loadRemote(resolved.name, slot);
      const module = await this.resolveLifecycleModule(container);
      return this.normalizeLifecycle(module, resolved.name);
    } catch (error) {
      const failure: ShellRuntimeFailure = {
        phase:
          error instanceof Error && /lifecycle/i.test(error.message) ? "lifecycle" : "remote-load",
        scope: toScope(slot),
        error: toError(error),
        mfeName: resolved.name,
        slot,
        severity: "error",
        url: this.options.getCurrentUrl(),
      };
      await this.options.renderFailure(failure);
      throw failure.error;
    }
  }

  private buildProps(resolved: ResolvedMFE, slot: string, element: HTMLElement): MFEProps {
    const auth = this.options.getAuthSnapshot();
    const sharedProps = this.options.getSharedProps();
    return {
      ...sharedProps,
      container: element,
      slot,
      basePath: resolved.basePath,
      config: resolved.config,
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      onNavigate: (path: string, options?: { replace?: boolean; state?: unknown }) =>
        this.options.navigate(path, options),
    };
  }

  private getIdentity(resolved: ResolvedMFE): string {
    return `${resolved.name}::${resolved.entryUrl}::${resolved.version ?? ""}`;
  }

  private async resolveLifecycleModule(container: Container): Promise<unknown> {
    try {
      const factory = await container.get("./lifecycle");
      return factory();
    } catch (error) {
      throw new Error(
        `Remote lifecycle module './lifecycle' could not be loaded: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private normalizeLifecycle(module: unknown, mfeName: string): MFELifecycle {
    const rootCandidate =
      module && typeof module === "object" ? (module as Record<string, unknown>) : null;
    const lifecycleCandidate =
      rootCandidate?.default && typeof rootCandidate.default === "object"
        ? (rootCandidate.default as Record<string, unknown>)
        : rootCandidate;
    const bootstrap = lifecycleCandidate?.bootstrap ?? rootCandidate?.bootstrap;
    const mount = lifecycleCandidate?.mount ?? rootCandidate?.mount;
    const unmount = lifecycleCandidate?.unmount ?? rootCandidate?.unmount;
    const update = lifecycleCandidate?.update ?? rootCandidate?.update;

    const missing: string[] = [];
    if (typeof mount !== "function") missing.push("mount");
    if (typeof unmount !== "function") missing.push("unmount");
    if (missing.length > 0) {
      throw new Error(
        `Remote '${mfeName}' is missing required lifecycle exports: ${missing.join(", ")}`,
      );
    }
    if (bootstrap && typeof bootstrap !== "function") {
      throw new Error(`Remote '${mfeName}' lifecycle export 'bootstrap' must be a function`);
    }
    if (update && typeof update !== "function") {
      throw new Error(`Remote '${mfeName}' lifecycle export 'update' must be a function`);
    }

    return {
      bootstrap:
        typeof bootstrap === "function" ? (bootstrap as MFELifecycle["bootstrap"]) : undefined,
      mount: mount as MFELifecycle["mount"],
      unmount: unmount as MFELifecycle["unmount"],
      update: typeof update === "function" ? (update as MFELifecycle["update"]) : undefined,
    };
  }
}
