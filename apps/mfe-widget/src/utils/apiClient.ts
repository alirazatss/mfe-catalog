import axios from 'axios';
import { onMFEEvent, MFE_EVENTS } from '@mf-mono/events';

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
  baseURL: '/api', // Adjust based on your backend
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
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
  }
);

/**
 * Response interceptor - Handle errors
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[MFE] Unauthorized - Token may be expired');
      // Shell will handle auto-refresh or logout
      // MFE just logs the error
    }

    return Promise.reject(error);
  }
);

/**
 * Initialize auth event listeners
 * Call this once when MFE bootstraps
 */
export function setupAuthListeners() {
  // Listen for logout events from shell
  onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, ({ reason }) => {
    console.log('[MFE] Auth logout event received:', reason);
    // Clear any local auth state if needed
  });

  // Listen for token refresh events
  onMFEEvent(MFE_EVENTS.AUTH_REFRESH, () => {
    console.log('[MFE] Auth refresh event received');
    // Token is already updated in shell, next request will use new token
  });

  if (import.meta.env.DEV) {
    console.log('[MFE] Auth event listeners registered');
  }
}
