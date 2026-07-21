/**
 * Thin Shell — MFE mount adapter.
 *
 * Bridges between the (future) MFE lifecycle contract and the current MFE
 * shape where MFEs expose a React `./App` component.
 *
 * The `mfe-lifecycle-contract` change will replace this adapter with a
 * proper `MFELifecycle` (bootstrap/mount/unmount/update) invocation.
 * Until then, we support both:
 *
 *   1. New style: exposed `./lifecycle` module implementing MFELifecycle
 *   2. Legacy style: exposed `./App` React component (current mfe-widget)
 *
 * Detection is at load-time via feature check on the module's exports.
 */

import type { DynamicLoader, ResolvedMFE, Container } from "@mf-mono/dynamic-loader";

interface LifecycleModule {
  bootstrap?: (props: unknown) => Promise<void>;
  mount: (props: unknown) => Promise<void>;
  unmount: (props: unknown) => Promise<void>;
  update?: (props: unknown) => Promise<void>;
}

interface ReactComponentModule {
  default: React.ComponentType<any>;
  App?: React.ComponentType<any>;
}

interface MountedInstance {
  name: string;
  slotId: string;
  props: MFEProps;
  strategy: "lifecycle" | "react-legacy";
  lifecycle?: LifecycleModule;
  reactRoot?: any; // React Root type — kept `any` to avoid importing React types here
  bootstrapped?: boolean;
}

export interface MFEProps {
  container: HTMLElement;
  slot?: string;
  user?: unknown;
  isAuthenticated?: boolean;
  basePath?: string;
  config?: Record<string, unknown>;
  onNavigate?: (path: string) => void;
  [key: string]: unknown;
}

const mounted = new Map<string, MountedInstance>();

/**
 * Mount an MFE (resolved) into a DOM slot.
 * Unmounts whatever is currently in that slot first.
 */
export async function mountMFE(
  loader: DynamicLoader,
  resolved: ResolvedMFE,
  slotId: string,
  extraProps: Partial<MFEProps> = {},
): Promise<void> {
  const slot = document.getElementById(slotId);
  if (!slot) {
    throw new Error(`Slot '${slotId}' not found`);
  }

  // Unmount previous occupant if different MFE
  const previousName = loader.getSlotOccupant(slotId);
  if (previousName && previousName !== resolved.name) {
    await unmountMFE(previousName);
  }

  const container = await loader.loadRemote(resolved.name, slotId);
  const module = await resolveMFEModule(container);

  const props: MFEProps = {
    container: slot,
    slot: slotId,
    basePath: resolved.basePath,
    config: resolved.config,
    ...extraProps,
  };

  if (isLifecycleModule(module)) {
    const instance: MountedInstance = {
      name: resolved.name,
      slotId,
      props,
      strategy: "lifecycle",
      lifecycle: module,
    };
    if (module.bootstrap) {
      await module.bootstrap(props);
      instance.bootstrapped = true;
    }
    await module.mount(props);
    mounted.set(resolved.name, instance);
  } else if (isReactComponentModule(module)) {
    // Legacy React MFE — render via React 19 createRoot.
    const Component = module.default ?? module.App;
    if (!Component) {
      throw new Error(`MFE '${resolved.name}' exposed no default or named 'App' component`);
    }
    const { createRoot } = await import("react-dom/client");
    const React = await import("react");
    slot.innerHTML = "";
    const root = createRoot(slot);
    root.render(React.createElement(Component, props as Record<string, unknown>));
    mounted.set(resolved.name, {
      name: resolved.name,
      slotId,
      props,
      strategy: "react-legacy",
      reactRoot: root,
    });
  } else {
    throw new Error(
      `MFE '${resolved.name}' exposes neither a lifecycle module nor a React component`,
    );
  }
}

/**
 * Unmount an MFE from its slot.
 */
export async function unmountMFE(name: string): Promise<void> {
  const instance = mounted.get(name);
  if (!instance) return;

  const slot = document.getElementById(instance.slotId);

  if (instance.strategy === "lifecycle" && instance.lifecycle) {
    await instance.lifecycle.unmount(instance.props);
  } else if (instance.strategy === "react-legacy" && instance.reactRoot) {
    instance.reactRoot.unmount();
  }

  if (slot) slot.innerHTML = "";
  mounted.delete(name);
}

/**
 * Resolve the MFE module by trying `./lifecycle` first, falling back to `./App`.
 */
async function resolveMFEModule(container: Container): Promise<unknown> {
  // Try lifecycle first (future contract)
  try {
    const factory = await container.get("./lifecycle");
    return factory();
  } catch {
    // Fall through to legacy React component
  }

  try {
    const factory = await container.get("./App");
    return factory();
  } catch {
    throw new Error("MFE exposed neither './lifecycle' nor './App'");
  }
}

function isLifecycleModule(mod: unknown): mod is LifecycleModule {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return typeof m.mount === "function" && typeof m.unmount === "function";
}

function isReactComponentModule(mod: unknown): mod is ReactComponentModule {
  if (!mod || typeof mod !== "object") return false;
  const m = mod as Record<string, unknown>;
  return typeof m.default === "function" || typeof m.App === "function";
}
