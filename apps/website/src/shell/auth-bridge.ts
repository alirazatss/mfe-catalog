/**
 * Thin Shell — auth bridge.
 *
 * Populates `window.__MFE_AUTH__` from the singleton TokenManager, matching
 * the ADR-0002 contract. MFEs read tokens and subscribe to changes via this
 * global. See openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/.
 *
 * This is a shell-local implementation. A cleaner version — including the
 * `setupAuthBridge` helper published from `@mfe-runtine/auth-ui` — arrives in the
 * `extract-auth-ui-package` change.
 */

import { tokenManager } from "@mfe-runtine/auth";
import { onMFEEvent, MFE_EVENTS } from "@mfe-runtine/events";

interface MFEAuthBridge {
  version: string;
  getToken(): string | null;
  isAuthenticated(): boolean;
  onTokenChange(cb: (token: string | null) => void): () => void;
  logout(): Promise<void>;
}

const BRIDGE_VERSION = "1.0.0";

let installed = false;

export function setupAuthBridge(): MFEAuthBridge {
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

  if (import.meta.env.DEV) {
    console.log("[shell] window.__MFE_AUTH__ bridge installed", BRIDGE_VERSION);
  }
  return bridge;
}
