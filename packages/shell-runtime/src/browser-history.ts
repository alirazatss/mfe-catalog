import type { NavigationAdapter, ShellRuntimeNavigateOptions } from "./contracts.js";

export interface BrowserHistoryAdapterOptions {
  window?: Window;
}

function normalizeDestination(raw: string, current: URL): string {
  if (!raw.startsWith("/") && !raw.startsWith("?") && !raw.startsWith("#")) {
    throw new Error(`Navigation destination must be application-relative: ${raw}`);
  }

  const next = new URL(raw, current);
  if (next.origin !== current.origin) {
    throw new Error(`Navigation destination must stay on the current origin: ${raw}`);
  }

  return `${next.pathname}${next.search}${next.hash}`;
}

export function createBrowserHistoryNavigationAdapter(
  options: BrowserHistoryAdapterOptions = {},
): NavigationAdapter {
  const targetWindow = options.window ?? window;
  const listeners = new Set<(url: URL) => void>();

  const notify = () => {
    const url = new URL(targetWindow.location.href);
    for (const listener of listeners) {
      listener(url);
    }
  };

  const handlePopState = () => {
    notify();
  };

  targetWindow.addEventListener("popstate", handlePopState);

  return {
    currentUrl: () => new URL(targetWindow.location.href),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          targetWindow.removeEventListener("popstate", handlePopState);
        }
      };
    },
    navigate(to: string, options?: ShellRuntimeNavigateOptions) {
      const normalized = normalizeDestination(to, new URL(targetWindow.location.href));
      if (options?.replace) {
        targetWindow.history.replaceState(options.state ?? null, "", normalized);
      } else {
        targetWindow.history.pushState(options?.state ?? null, "", normalized);
      }
      notify();
    },
  };
}
