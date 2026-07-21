/**
 * Thin Shell — bootstrap entry.
 *
 * The ENTIRE shell runtime. Vanilla TypeScript; no React import.
 *
 * Responsibilities:
 *   1. Fetch and validate manifest
 *   2. Initialize TokenManager and expose `window.__MFE_AUTH__`
 *   3. Mount chrome MFEs into their slots (from `manifest.chrome`)
 *   4. Mount the feature MFE matching the current URL (from `manifest.features`)
 *   5. Listen for popstate + `mfe:navigate` events to swap feature MFEs
 *
 * Failure modes:
 *   - Manifest unreachable: render critical-error template into #app
 *   - Auth init throws: log, treat user as unauthenticated, continue
 *   - Feature MFE load fails: (temporary) log to console. Slot-level fallback UI
 *     arrives in the `graceful-failure-boundaries` change.
 *
 * See:
 *   - openspec/changes/refactor-to-thin-shell/specs/thin-shell-bootstrap/spec.md
 *   - docs/adr/0004-chrome-mfe-pattern.md
 */

import "./style.css";
import { tokenManager } from "@mf-mono/auth";
import { DynamicLoader } from "@mf-mono/dynamic-loader";
import { onMFEEvent, MFE_EVENTS } from "@mf-mono/events";
import { setupAuthBridge } from "./shell/auth-bridge.js";
import { renderCriticalError } from "./shell/critical-error.js";
import { fetchManifest } from "./shell/manifest.js";
import { userFromToken } from "./shell/auth-helpers.js";
import { applyGuardOutcome, evaluateRoute } from "./shell/router.js";
import { mountMFE, unmountMFE } from "./shell/mfe-mount.js";

async function bootstrap(): Promise<void> {
  // 1. Fetch manifest first — nothing else can happen without it.
  const manifest = await fetchManifest();
  if (!manifest) {
    renderCriticalError("Unable to load application manifest");
    return;
  }

  const loader = new DynamicLoader();
  loader.setConfig(manifest);

  // 2. Initialize auth (best effort — failure is OK, user just isn't signed in).
  try {
    await tokenManager.refreshToken();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[shell] Auth init failed (user likely unauthenticated):", error);
    }
  }
  setupAuthBridge();

  // 3. Mount all chrome MFEs in parallel.
  await Promise.all(
    loader.listChromeMFEs().map(async ([slot, resolved]) => {
      const slotId = `${slot}-slot`;
      try {
        await mountMFE(loader, resolved, slotId, currentAppProps());
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`[shell] Chrome MFE '${resolved.name}' failed to mount:`, error);
        }
      }
    }),
  );

  // 4. Mount the feature MFE for the current URL (with guards).
  await mountFeatureForCurrentUrl(loader);

  // 5. Wire up navigation listeners.
  registerNavigationHandlers(loader);

  if (import.meta.env.DEV) {
    console.log("[shell] Bootstrap complete");
  }
}

async function mountFeatureForCurrentUrl(loader: DynamicLoader): Promise<void> {
  const outcome = evaluateRoute(loader, window.location.pathname);
  const feature = applyGuardOutcome(outcome);
  if (!feature) return; // redirect / not-found / denied already handled

  try {
    await mountMFE(loader, feature, "main-slot", currentAppProps());
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[shell] Feature '${feature.name}' failed to mount:`, error);
    }
    // Slot-level fallback UI arrives in graceful-failure-boundaries change.
    const slot = document.getElementById("main-slot");
    if (slot) {
      slot.innerHTML = `<div class="mfe-error" role="alert">Feature temporarily unavailable</div>`;
    }
  }
}

function registerNavigationHandlers(loader: DynamicLoader): void {
  // Browser back/forward
  window.addEventListener("popstate", () => {
    void handleRouteChange(loader);
  });

  // Cross-MFE navigation event bus (existing @mf-mono/events channel)
  onMFEEvent(
    MFE_EVENTS.NAVIGATE,
    (payload: { path: string; state?: unknown; replace?: boolean }) => {
      if (!payload || typeof payload.path !== "string" || !payload.path.startsWith("/")) return;
      const url = payload.path;
      if (payload.replace) {
        window.history.replaceState(payload.state ?? null, "", url);
      } else {
        window.history.pushState(payload.state ?? null, "", url);
      }
      void handleRouteChange(loader);
    },
  );
}

async function handleRouteChange(loader: DynamicLoader): Promise<void> {
  // If a feature MFE is currently mounted, unmount it before route change.
  const currentInMain = loader.getSlotOccupant("main-slot");
  if (currentInMain) {
    const stillMatches = loader.matchRoute(window.location.pathname);
    if (!stillMatches || stillMatches.name !== currentInMain) {
      await unmountMFE(currentInMain);
      loader.clearSlot("main-slot");
    } else {
      // Same MFE handles the new URL (its React Router will re-render).
      return;
    }
  }
  await mountFeatureForCurrentUrl(loader);
}

function currentAppProps(): {
  user: ReturnType<typeof userFromToken>;
  isAuthenticated: boolean;
  onNavigate: (path: string) => void;
} {
  const token = tokenManager.getAccessToken();
  return {
    user: userFromToken(token),
    isAuthenticated: tokenManager.isAuthenticated(),
    onNavigate: (path: string) => {
      window.history.pushState(null, "", path);
      // Trigger the same handler; a lightweight synthetic event keeps things simple.
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}

bootstrap().catch((error) => {
  console.error("[shell] Fatal bootstrap error:", error);
  renderCriticalError(error instanceof Error ? error.message : String(error));
});
