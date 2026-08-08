/**
 * @mfe-runtime/shell-kit — Runtime config factory
 *
 * Implements shell-kit / Shell runtime-config factory with override hooks.
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 *
 * Produces a valid ShellRuntimeConfig from an AppConfig plus shell-specific options,
 * so shells declare only what differs instead of re-implementing the full config.
 */

import type { AppConfig } from "@mfe-runtime/app-config";
import type {
  ShellRuntimeConfig,
  FailureRenderer,
  NavigationAdapter,
  SlotResolver,
  SharedPropsFactory,
  ShellRuntimeFailure,
} from "@mfe-runtime/shell-runtime";
import { userFromToken, type DecodedUser } from "@mfe-runtime/auth";
import { MFE_EVENTS, onMFEEvent } from "@mfe-runtime/events";
import type { RemoteConfig } from "@mfe-runtime/remote-config";
import type { TokenManager } from "./auth-bridge";
import { loadManifest } from "./loaders";

export interface RuntimeConfigOptions {
  /**
   * Token manager instance for auth operations
   */
  tokenManager: TokenManager;

  /**
   * Fallback manifest used when network fetch fails
   */
  fallbackManifest: RemoteConfig;

  /**
   * Custom failure renderer (optional, defaults to console-only renderer)
   */
  failureRenderer?: FailureRenderer;

  /**
   * Slot ID resolver override (optional, defaults to "{slot}-slot" pattern)
   */
  resolveSlot?: SlotResolver;

  /**
   * Navigation adapter override (optional, defaults to browser history)
   */
  navigation?: NavigationAdapter;

  /**
   * Shared props factory override (optional, defaults to user + isAuthenticated)
   */
  getSharedProps?: SharedPropsFactory;
}

/**
 * Create a default failure renderer that logs to console.
 */
function createDefaultFailureRenderer(): FailureRenderer {
  return {
    render(failure: ShellRuntimeFailure) {
      console.error("[shell-kit] Runtime failure:", failure);
    },
    clear() {
      // No-op for console renderer
    },
  };
}

/**
 * Create a default slot resolver using the "{slot}-slot" pattern.
 */
function createDefaultSlotResolver(): SlotResolver {
  return (slot: string) => {
    return document.getElementById(slot === "main" ? "main-slot" : `${slot}-slot`);
  };
}

/**
 * Create a default navigation adapter using browser history API.
 */
function createDefaultNavigationAdapter(): NavigationAdapter {
  return {
    currentUrl: () => new URL(window.location.href),
    subscribe(listener: (url: URL) => void) {
      const handlePopState = () => {
        listener(new URL(window.location.href));
      };

      window.addEventListener("popstate", handlePopState);
      const cleanupNavigate = onMFEEvent(
        MFE_EVENTS.NAVIGATE,
        (payload: { path: string; state?: unknown; replace?: boolean }) => {
          if (!payload || typeof payload.path !== "string" || !payload.path.startsWith("/")) {
            return;
          }
          if (payload.replace) {
            window.history.replaceState(payload.state ?? null, "", payload.path);
          } else {
            window.history.pushState(payload.state ?? null, "", payload.path);
          }
          listener(new URL(window.location.href));
        },
      );

      return () => {
        window.removeEventListener("popstate", handlePopState);
        cleanupNavigate();
      };
    },
    navigate(path: string, options?: { replace?: boolean; state?: unknown }) {
      if (options?.replace) {
        window.history.replaceState(options.state ?? null, "", path);
      } else {
        window.history.pushState(options?.state ?? null, "", path);
      }
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}

/**
 * Create a default shared props factory.
 */
function createDefaultSharedPropsFactory(tokenManager: TokenManager): SharedPropsFactory {
  return () => ({
    user: userFromToken(tokenManager.getAccessToken()),
    isAuthenticated: tokenManager.isAuthenticated(),
  });
}

/**
 * Create a ShellRuntimeConfig from an AppConfig and shell-specific options.
 *
 * Implements shell-kit / Shell runtime-config factory with override hooks.
 *
 * @param appConfig - The validated app configuration
 * @param options - Shell-specific options and overrides
 * @returns A valid ShellRuntimeConfig ready for createShellRuntime
 */
export function createRuntimeConfig(
  appConfig: AppConfig,
  options: RuntimeConfigOptions,
): ShellRuntimeConfig<DecodedUser> {
  // TODO: Use appConfig values for auth initialization and API calls
  // For now, appConfig is validated and available but not yet wired into auth/API layers
  void appConfig;

  return {
    manifest: {
      async load() {
        return await loadManifest(undefined, options.fallbackManifest);
      },
    },
    auth: {
      async initialize() {
        // Token refresh should be handled by the shell before calling this
        // This is a no-op placeholder for future auth initialization
      },
      isAuthenticated: () => options.tokenManager.isAuthenticated(),
      getUser: () => userFromToken(options.tokenManager.getAccessToken()),
      getRoles: () => userFromToken(options.tokenManager.getAccessToken())?.roles ?? [],
    },
    navigation: options.navigation ?? createDefaultNavigationAdapter(),
    resolveSlot: options.resolveSlot ?? createDefaultSlotResolver(),
    renderer: options.failureRenderer ?? createDefaultFailureRenderer(),
    getSharedProps: options.getSharedProps ?? createDefaultSharedPropsFactory(options.tokenManager),
  };
}
