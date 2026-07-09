/**
 * Standard event names used across the application
 * 
 * Convention: mfe:domain:action
 * - mfe: prefix to avoid collision with browser events
 * - domain: feature area (auth, cart, error, etc.)
 * - action: what happened (login, logout, failed, etc.)
 */
export const MFE_EVENTS = {
  // Auth events
  AUTH_LOGIN: 'mfe:auth:login',
  AUTH_LOGOUT: 'mfe:auth:logout',
  AUTH_TOKEN_REFRESHED: 'mfe:auth:token-refreshed',
  AUTH_SESSION_EXPIRED: 'mfe:auth:session-expired',

  // Navigation events (formalize existing pattern)
  NAVIGATE: 'mfe:navigate',

  // Error events
  ERROR_MFE_LOAD_FAILED: 'mfe:error:mfe-load-failed',
  ERROR_API_FAILED: 'mfe:error:api-failed',
  ERROR_COMPONENT_FAILED: 'mfe:error:component-failed',
} as const;

/**
 * Type definitions for event payloads
 * Maps event names to their expected payload types
 */
export interface MFEEventMap {
  // Auth event payloads
  [MFE_EVENTS.AUTH_LOGIN]: { userId: string; email: string };
  [MFE_EVENTS.AUTH_LOGOUT]: { userId?: string };
  [MFE_EVENTS.AUTH_TOKEN_REFRESHED]: { token: string };
  [MFE_EVENTS.AUTH_SESSION_EXPIRED]: undefined;

  // Navigation event payload
  [MFE_EVENTS.NAVIGATE]: { path: string; state?: any; replace?: boolean };

  // Error event payloads
  [MFE_EVENTS.ERROR_MFE_LOAD_FAILED]: { mfeName: string; error: Error; timestamp: number };
  [MFE_EVENTS.ERROR_API_FAILED]: { endpoint: string; status?: number; error: Error };
  [MFE_EVENTS.ERROR_COMPONENT_FAILED]: { componentName: string; error: Error };
}
