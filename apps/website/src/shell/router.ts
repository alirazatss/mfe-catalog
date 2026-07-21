/**
 * Thin Shell — routing + guards.
 *
 * Vanilla-JS route matching and authentication/authorization guards.
 * Runs during bootstrap and on every navigation event. Called by the shell
 * `main.ts` — no React Router in the shell.
 *
 * See:
 * - openspec/changes/refactor-to-thin-shell/specs/hybrid-routing/spec.md
 * - openspec/changes/refactor-to-thin-shell/specs/route-guards/spec.md
 */

import { tokenManager } from "@mf-mono/auth";
import type { DynamicLoader, ResolvedMFE } from "@mf-mono/dynamic-loader";
import { hasRequiredRoles, userFromToken } from "./auth-helpers.js";
import { renderAccessDeniedIntoMain, renderNotFoundIntoMain } from "./slots.js";

export type GuardOutcome =
  | { kind: "allow"; feature: ResolvedMFE }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" }
  | { kind: "denied" };

/**
 * Decide what to do for the current URL:
 *   - allow: mount the feature MFE
 *   - redirect: navigate the browser to the login page
 *   - not-found: no manifest feature matches
 *   - denied: user lacks required role
 */
export function evaluateRoute(loader: DynamicLoader, pathname: string): GuardOutcome {
  const feature = loader.matchRoute(pathname);
  if (!feature) return { kind: "not-found" };

  // Secure by default — `requiresAuth` is defaulted to true by DynamicLoader.
  const requiresAuth = feature.requiresAuth !== false;
  if (requiresAuth && !tokenManager.isAuthenticated()) {
    const returnUrl = encodeURIComponent(pathname);
    return { kind: "redirect", to: `/login?returnUrl=${returnUrl}` };
  }

  const requiredRoles = feature.requiredRoles ?? [];
  if (requiredRoles.length > 0) {
    const user = userFromToken(tokenManager.getAccessToken());
    if (!hasRequiredRoles(user, requiredRoles)) {
      return { kind: "denied" };
    }
  }

  return { kind: "allow", feature };
}

/**
 * Convenience: run the guard outcome (navigate / render placeholder).
 * Returns the feature MFE if the caller should mount it, otherwise null.
 */
export function applyGuardOutcome(outcome: GuardOutcome): ResolvedMFE | null {
  switch (outcome.kind) {
    case "allow":
      return outcome.feature;
    case "redirect":
      window.location.href = outcome.to;
      return null;
    case "not-found":
      renderNotFoundIntoMain();
      return null;
    case "denied":
      renderAccessDeniedIntoMain();
      return null;
  }
}
