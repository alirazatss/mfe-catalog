import type { RemoteConfig } from "@mfe-runtine/remote-config";

export interface MFEProps {
  container: HTMLElement;
  slot?: string;
  user?: unknown;
  isAuthenticated?: boolean;
  theme?: string;
  locale?: string;
  basePath?: string;
  config?: Record<string, unknown>;
  onNavigate?: (
    path: string,
    options?: { replace?: boolean; state?: unknown },
  ) => void | Promise<void>;
  [key: string]: unknown;
}

export interface MFELifecycle {
  bootstrap?: (props: MFEProps) => Promise<void>;
  mount: (props: MFEProps) => Promise<void>;
  unmount: (props: MFEProps) => Promise<void>;
  update?: (props: MFEProps) => Promise<void>;
}

/**
 * Loader status information
 */
export interface LoaderStatus {
  /** Whether the loader has been initialized */
  initialized: boolean;
  /** Whether the config has been loaded */
  configLoaded: boolean;
  /** Names of remotes that have been loaded */
  remotesLoaded: string[];
}

/**
 * Loader event types
 */
export type LoaderEventType =
  | "config:fetch:start"
  | "config:fetch:success"
  | "config:fetch:error"
  | "remote:load:start"
  | "remote:load:success"
  | "remote:load:error"
  | "remote:preload:success";

/**
 * Event data payloads
 */
export interface LoaderEventData {
  "config:fetch:start": undefined;
  "config:fetch:success": { config: RemoteConfig };
  "config:fetch:error": { error: Error };
  "remote:load:start": { name: string };
  "remote:load:success": { name: string; container: any };
  "remote:load:error": { name: string; error: Error };
  "remote:preload:success": { name: string };
}

/**
 * Event listener function
 */
export type LoaderEventListener<T extends LoaderEventType> = (data: LoaderEventData[T]) => void;

/**
 * Module Federation container interface
 */
export interface Container {
  init(shareScope: any): Promise<void>;
  get(module: string): Promise<() => any>;
}

/**
 * Webpack Module Federation globals
 */
declare global {
  // eslint-disable-next-line no-var
  var __webpack_init_sharing__: ((scope: string) => Promise<void>) | undefined;
  // eslint-disable-next-line no-var
  var __webpack_share_scopes__: { default: any } | undefined;
}
