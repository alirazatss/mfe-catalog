/**
 * Cross-MFE navigation utility
 * Dispatches custom events for shell-level navigation
 */

export interface NavigationOptions {
  state?: any;
  replace?: boolean;
}

/**
 * Navigate to a different route (can be in a different MFE)
 * This dispatches a custom event that the shell router listens to
 */
export function navigateTo(path: string, options: NavigationOptions = {}) {
  const event = new CustomEvent("mfe:navigate", {
    detail: {
      path,
      state: options.state,
      replace: options.replace,
    },
  });

  window.dispatchEvent(event);

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
