import { tokenManager } from "@mfe-runtime/auth";
import { MFE_EVENTS, onMFEEvent } from "@mfe-runtime/events";
import type {
  FailureRenderer,
  FailureScope,
  ShellRuntimeConfig,
  ShellRuntimeFailure,
} from "@mfe-runtime/shell-runtime";
import type { AppConfig } from "@mfe-runtime/app-config";
import { userFromToken } from "./auth-helpers.js";
import { setupAuthBridge } from "./auth-bridge.js";
import { renderCriticalError } from "./critical-error.js";
import { fetchManifest } from "./manifest.js";
import { clearSlot, renderAccessDeniedIntoMain, renderNotFoundIntoMain } from "./slots.js";

function routeFailurePath(failure: ShellRuntimeFailure): string {
  return failure.url ?? window.location.pathname;
}

function renderFeatureUnavailable(slotId: string): void {
  const slot = document.getElementById(slotId);
  if (!slot) {
    return;
  }
  slot.innerHTML = '<div class="mfe-error" role="alert">Feature temporarily unavailable</div>';
}

function clearFailureScope(scope: FailureScope): void {
  if (scope.kind === "critical") {
    return;
  }
  if (scope.kind === "route") {
    clearSlot("main-slot");
    return;
  }
  clearSlot(`${scope.slot}-slot`);
}

export function createWebsiteFailureRenderer(): FailureRenderer {
  return {
    render(failure) {
      if (failure.scope.kind === "critical") {
        renderCriticalError(failure.error.message);
        return;
      }

      if (failure.scope.kind === "route") {
        if (failure.route === "unauthenticated") {
          const returnUrl = encodeURIComponent(routeFailurePath(failure));
          window.location.href = `/login?returnUrl=${returnUrl}`;
          return;
        }
        if (failure.route === "forbidden") {
          renderAccessDeniedIntoMain();
          return;
        }
        if (failure.route === "not-found") {
          renderNotFoundIntoMain();
          return;
        }

        renderFeatureUnavailable("main-slot");
        return;
      }

      renderFeatureUnavailable(`${failure.scope.slot}-slot`);
    },
    clear(scope) {
      clearFailureScope(scope);
    },
  };
}

export function createWebsiteShellRuntimeConfig(appConfig: AppConfig): ShellRuntimeConfig {
  // TODO: Use appConfig values for auth initialization and API calls
  // For now, appConfig is validated and available but not yet wired into auth/API layers
  void appConfig; // Suppress unused warning
  return {
    manifest: {
      async load() {
        // Implements TSB-1: no fallback, fetch failure propagates
        // If fetchManifest rejects, shell-runtime will call failureRenderer with critical scope
        return await fetchManifest();
      },
    },
    auth: {
      async initialize() {
        try {
          await tokenManager.refreshToken();
        } finally {
          setupAuthBridge();
        }
      },
      isAuthenticated: () => tokenManager.isAuthenticated(),
      getUser: () => userFromToken(tokenManager.getAccessToken()),
      getRoles: () => userFromToken(tokenManager.getAccessToken())?.roles ?? [],
    },
    navigation: {
      currentUrl: () => new URL(window.location.href),
      subscribe(listener) {
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
      navigate(path, options) {
        if (options?.replace) {
          window.history.replaceState(options.state ?? null, "", path);
        } else {
          window.history.pushState(options?.state ?? null, "", path);
        }
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
    },
    resolveSlot(slot) {
      return document.getElementById(slot === "main" ? "main-slot" : `${slot}-slot`);
    },
    renderer: createWebsiteFailureRenderer(),
    getSharedProps: () => ({
      user: userFromToken(tokenManager.getAccessToken()),
      isAuthenticated: tokenManager.isAuthenticated(),
    }),
  };
}
