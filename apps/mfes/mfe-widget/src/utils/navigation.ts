/**
 * Cross-MFE navigation utility
 * Uses event bus for shell-level navigation
 */
import { emitMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";

export interface NavigationOptions {
  state?: any;
  replace?: boolean;
}

/**
 * Navigate to a different route (can be in a different MFE)
 * Emits navigation event that the shell router listens to
 */
export function navigateTo(path: string, options: NavigationOptions = {}) {
  emitMFEEvent(MFE_EVENTS.NAVIGATE, {
    path,
    state: options.state,
    replace: options.replace,
  });

  if (import.meta.env.DEV) {
    console.log(`[Navigation] Dispatched navigation to: ${path}`, options);
  }
}

/**
 * Navigate with query parameters
 */
export function navigateWithParams(
  path: string,
  params: Record<string, string>,
  options: NavigationOptions = {},
) {
  const queryString = new URLSearchParams(params).toString();
  const fullPath = queryString ? `${path}?${queryString}` : path;
  navigateTo(fullPath, options);
}
