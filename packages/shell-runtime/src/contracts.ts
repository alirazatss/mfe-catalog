import type { DynamicLoader, ResolvedMFE } from "@mfe-runtime/dynamic-loader";
import type { RemoteConfig } from "@mfe-runtime/remote-config";

export interface ShellRuntimeNavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export interface ManifestProvider {
  load(): Promise<unknown>;
}

export interface AuthAdapter<User = unknown> {
  initialize?(): Promise<void>;
  isAuthenticated(): boolean;
  getUser(): User | null;
  getRoles?(): readonly string[];
  subscribe?(listener: () => void): () => void;
}

export interface NavigationAdapter {
  currentUrl(): URL;
  subscribe(listener: (url: URL) => void): () => void;
  navigate(to: string, options?: ShellRuntimeNavigateOptions): void | Promise<void>;
}

export type SlotResolver = (slot: string) => HTMLElement | null;

export type FailureScope =
  | { kind: "critical" }
  | { kind: "route" }
  | { kind: "slot"; slot: string };

export type ShellRuntimeFailurePhase =
  | "environment"
  | "configuration"
  | "manifest"
  | "auth"
  | "route"
  | "slot"
  | "remote-load"
  | "lifecycle"
  | "navigation"
  | "cleanup"
  | "renderer";

export interface ShellRuntimeFailure {
  phase: ShellRuntimeFailurePhase;
  scope: FailureScope;
  error: Error;
  mfeName?: string;
  slot?: string;
  url?: string;
  route?: string;
  severity: "warning" | "error";
}

export interface FailureRenderer {
  render(failure: ShellRuntimeFailure): void | Promise<void>;
  clear(scope: FailureScope): void | Promise<void>;
}

export type SharedPropsFactory = () => Record<string, unknown>;

export type SharedPropsSubscriber = (listener: () => void) => (() => void) | void;

export type ShellRuntimeStateKind =
  | "idle"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "disposing"
  | "disposed";

export interface ShellRuntimeState {
  kind: ShellRuntimeStateKind;
  activeUrl: string | null;
  activeFeature: string | null;
  activeChrome: Record<string, string>;
  pendingNavigation: string | null;
}

export interface ShellRuntimeObserverEventMap {
  "runtime:state": { state: ShellRuntimeState };
  "runtime:manifest": { manifest: RemoteConfig };
  "runtime:route": {
    url: string;
    outcome: "allow" | "unauthenticated" | "forbidden" | "not-found";
    feature?: ResolvedMFE;
  };
  "runtime:lifecycle": {
    mfeName: string;
    slot: string;
    action: "bootstrap" | "mount" | "update" | "unmount";
    url?: string;
  };
  "runtime:failure": { failure: ShellRuntimeFailure };
  "runtime:recovery": { scope: FailureScope };
}

export type ShellRuntimeObserverEvent = {
  [K in keyof ShellRuntimeObserverEventMap]: { type: K } & ShellRuntimeObserverEventMap[K];
}[keyof ShellRuntimeObserverEventMap];

export type ShellRuntimeObserver = (event: ShellRuntimeObserverEvent) => void;

export interface ShellRuntimeConfig<User = unknown> {
  manifest: ManifestProvider;
  auth: AuthAdapter<User>;
  navigation: NavigationAdapter;
  resolveSlot: SlotResolver;
  renderer: FailureRenderer;
  getSharedProps?: SharedPropsFactory;
  subscribeSharedProps?: SharedPropsSubscriber;
  observe?: ShellRuntimeObserver;
  loader?: DynamicLoader;
}

export interface ShellRuntime {
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  getState(): ShellRuntimeState;
}
