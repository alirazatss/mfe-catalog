import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../providers/AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Require authentication (default: true)
   * Set to false for public routes
   */
  requireAuth?: boolean;
  /**
   * Redirect path when not authenticated (default: '/login')
   */
  redirectTo?: string;
}

/**
 * ProtectedRoute - Guards routes that require authentication
 *
 * Usage:
 * ```tsx
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 * ```
 *
 * Features:
 * - Redirects to login if not authenticated
 * - Preserves return URL in location state
 * - Shows loading state while checking auth
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if auth required but not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save current location to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}
