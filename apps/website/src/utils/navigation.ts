/**
 * Cross-MFE navigation utilities
 */
import { emitMFEEvent, MFE_EVENTS } from '@mf-mono/events';

export interface NavigationOptions {
  state?: any;
  replace?: boolean;
}

/**
 * Navigate to a path from within an MFE
 * Emits navigation event that the shell listens to
 */
export function navigateTo(path: string, options: NavigationOptions = {}): void {
  // Validate path
  if (!path.startsWith("/")) {
    console.error("[Navigation] Path must start with '/', got:", path);
    return;
  }

  // Reject external URLs for security
  if (path.startsWith("http://") || path.startsWith("https://")) {
    console.error("[Navigation] External URLs not allowed:", path);
    return;
  }

  // Emit event using event bus
  emitMFEEvent(MFE_EVENTS.NAVIGATE, {
    path,
    state: options.state,
    replace: options.replace || false,
  });

  if (import.meta.env.DEV) {
    console.log(`[Navigation] Emitted navigation event: ${path}`);
  }
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Navigate with query parameters
 */
export function navigateWithParams(
  path: string,
  params: Record<string, any>,
  options: NavigationOptions = {},
): void {
  const queryString = buildQueryString(params);
  navigateTo(`${path}${queryString}`, options);
}
