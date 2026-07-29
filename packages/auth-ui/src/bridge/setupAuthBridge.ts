/**
 * @mfe-runtime/auth-ui/bridge — vanilla `window.__MFE_AUTH__` setup.
 *
 * Populate the global auth API that MFEs consume. Called ONCE from the shell
 * bootstrap, ideally before any MFE mounts. No React dependency.
 *
 * See ADR-0002 (Authentication Ownership) and openspec/changes/extract-auth-ui-package/.
 */

import { tokenManager } from "@mfe-runtime/auth";
import { emitMFEEvent, onMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";

const BRIDGE_VERSION = "1.0.0";

/**
 * Global auth API exposed at `window.__MFE_AUTH__`.
 */
export interface MFEAuthBridge {
  version: string;
  getToken(): string | null;
  isAuthenticated(): boolean;
  onTokenChange(callback: (token: string | null) => void): () => void;
  logout(): Promise<void>;
}

interface WindowWithMFEAuth {
  __MFE_AUTH__?: MFEAuthBridge;
}

/**
 * Install `window.__MFE_AUTH__`. Safe to call multiple times — subsequent
 * calls return the existing bridge without replacing subscribers.
 */
export function setupAuthBridge(): MFEAuthBridge {
  const win = window as unknown as WindowWithMFEAuth;
  if (win.__MFE_AUTH__) {
    return win.__MFE_AUTH__;
  }

  const bridge: MFEAuthBridge = {
    version: BRIDGE_VERSION,
    getToken: () => tokenManager.getAccessToken(),
    isAuthenticated: () => tokenManager.isAuthenticated(),

    onTokenChange(callback) {
      const cleanupRefresh = onMFEEvent(MFE_EVENTS.AUTH_REFRESH, () => {
        callback(tokenManager.getAccessToken());
      });
      const cleanupLogin = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, () => {
        callback(tokenManager.getAccessToken());
      });
      const cleanupLogout = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, () => {
        callback(null);
      });
      return () => {
        cleanupRefresh();
        cleanupLogin();
        cleanupLogout();
      };
    },

    async logout() {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // Network failure — still clear local state below.
      }
      tokenManager.clear();
      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { reason: "user_initiated" });
    },
  };

  win.__MFE_AUTH__ = bridge;
  return bridge;
}

/**
 * Remove `window.__MFE_AUTH__`. Intended for tests. Does NOT unsubscribe
 * consumers — they need to call the cleanup functions they were given.
 */
export function teardownAuthBridge(): void {
  const win = window as unknown as WindowWithMFEAuth;
  delete win.__MFE_AUTH__;
}
