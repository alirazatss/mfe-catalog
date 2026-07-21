import axios from "axios";
import { onMFEEvent, MFE_EVENTS } from "@mf-mono/events";

/**
 * API Client for MFE Widget
 *
 * Features:
 * - Auto-injects access token from shell
 * - Listens for auth events (logout, refresh)
 * - Axios instance configured for backend API calls
 */

// Create axios instance
export const apiClient = axios.create({
  baseURL: "/api", // Adjust based on your backend
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor - Inject access token
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from shell's global auth object
    const getAccessToken = (window as any).__AUTH__?.getAccessToken;

    if (getAccessToken) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response interceptor - Handle errors and auto-retry on 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Auto-retry on 401 (token expired)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log("[MFE] 401 Unauthorized - Waiting for token refresh...");

      // Wait briefly for shell's TokenManager to auto-refresh
      // TokenManager refreshes at 80% lifetime, but if we hit 401,
      // it will refresh immediately via the AUTH_LOGOUT event handling
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Get fresh token from shell
      const getAccessToken = (window as any).__AUTH__?.getAccessToken;
      if (getAccessToken) {
        const token = getAccessToken();

        if (token) {
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;

          console.log("[MFE] Retrying request with refreshed token");
          return apiClient(originalRequest);
        }
      }

      console.error("[MFE] Token refresh failed - logging out");
    }

    return Promise.reject(error);
  },
);

/**
 * Initialize auth event listeners
 * Call this once when MFE bootstraps
 */
export function setupAuthListeners() {
  // Listen for logout events from shell
  onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, ({ reason }) => {
    console.log("[MFE] Auth logout event received:", reason);
    // Clear any local auth state if needed
  });

  // Listen for token refresh events
  onMFEEvent(MFE_EVENTS.AUTH_REFRESH, () => {
    console.log("[MFE] Auth refresh event received");
    // Token is already updated in shell, next request will use new token
  });

  if (import.meta.env.DEV) {
    console.log("[MFE] Auth event listeners registered");
  }
}
