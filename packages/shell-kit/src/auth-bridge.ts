/**
 * @mfe-runtime/shell-kit — Auth bridge setup
 *
 * Implements shell-kit / Auth bridge setup.
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 *
 * Populates `window.__MFE_AUTH__` from a TokenManager per ADR-0002 contract.
 * MFEs read tokens and subscribe to changes via this global.
 */

import { MFE_EVENTS, onMFEEvent } from "@mfe-runtime/events";

export interface TokenManager {
  getAccessToken(): string | null;
  isAuthenticated(): boolean;
  clear(): void;
}

export interface MFEAuthBridge {
  version: string;
  getToken(): string | null;
  isAuthenticated(): boolean;
  onTokenChange(cb: (token: string | null) => void): () => void;
  logout(): Promise<void>;
}

const BRIDGE_VERSION = "1.0.0";

let installed = false;

export function setupAuthBridge(tokenManager: TokenManager): MFEAuthBridge {
  if (installed && (window as any).__MFE_AUTH__) {
    return (window as any).__MFE_AUTH__ as MFEAuthBridge;
  }

  const bridge: MFEAuthBridge = {
    version: BRIDGE_VERSION,
    getToken: () => tokenManager.getAccessToken(),
    isAuthenticated: () => tokenManager.isAuthenticated(),
    onTokenChange(cb) {
      const cleanupRefresh = onMFEEvent(MFE_EVENTS.AUTH_REFRESH, (payload: any) => {
        cb(payload?.newToken ?? tokenManager.getAccessToken());
      });
      const cleanupLogout = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, () => {
        cb(null);
      });
      return () => {
        cleanupRefresh();
        cleanupLogout();
      };
    },
    async logout() {
      // Fire-and-forget backend logout; even if it fails, clear local state.
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // Ignore network errors — we still clear local state below.
      }
      tokenManager.clear();
    },
  };

  (window as any).__MFE_AUTH__ = bridge;
  installed = true;

  if (import.meta.env?.DEV) {
    console.log("[shell-kit] window.__MFE_AUTH__ bridge installed", BRIDGE_VERSION);
  }
  return bridge;
}
