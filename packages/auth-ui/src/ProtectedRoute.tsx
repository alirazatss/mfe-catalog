import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.js";

export interface ProtectedRouteProps {
  children: ReactNode;
  /** Redirect target when unauthenticated (default: "/login"). */
  redirectTo?: string;
  /** Optional role gate — user must have at least one of these roles. */
  requiredRoles?: string[];
  /** Custom fallback rendered when role check fails (default: minimal "Access denied"). */
  deniedFallback?: ReactNode;
}

/**
 * ProtectedRoute — React Router guard component.
 *
 * Redirects unauthenticated visitors to `/login?returnUrl=<current>`.
 * Optionally enforces role membership; falls back to `deniedFallback` if
 * the user is authenticated but lacks any required role.
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
  requiredRoles,
  deniedFallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "40vh",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}`;
    const target = `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`;
    return <Navigate to={target} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const roles = user?.roles ?? [];
    const allowed = requiredRoles.some((role) => roles.includes(role));
    if (!allowed) {
      return (
        <>
          {deniedFallback ?? (
            <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
              <h1>Access denied</h1>
              <p>You don't have permission to view this page.</p>
            </div>
          )}
        </>
      );
    }
  }

  return <>{children}</>;
}
