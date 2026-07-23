import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { tokenManager, type User, type LoginCredentials } from "@mfe-runtine/auth";
import { emitMFEEvent, onMFEEvent, MFE_EVENTS } from "@mfe-runtine/events";

/**
 * Auth context value available to all components
 */
interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider - Manages Keycloak authentication state
 *
 * Flow:
 * 1. User submits credentials
 * 2. Frontend calls backend /api/auth/login
 * 3. Backend exchanges credentials with Keycloak
 * 4. Backend returns access token + sets HttpOnly refresh cookie
 * 5. Access token stored in memory via TokenManager
 * 6. Refresh token auto-sent with future requests via cookie
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state on mount
   * Check if we have a valid session (refresh token cookie exists)
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh token (will work if refresh cookie exists)
        await tokenManager.refreshToken();

        // If refresh succeeded, we're authenticated
        const token = tokenManager.getAccessToken();
        if (token) {
          // TODO: Optionally fetch user info from token or backend
          // For now, decode user from JWT payload
          const payload = decodeJWTPayload(token);
          setUser({
            id: payload.sub || "",
            email: payload.email || "",
            name: payload.name || payload.preferred_username || "",
            roles: payload.realm_access?.roles || [],
          });
          setIsAuthenticated(true);
        }
      } catch (error) {
        // No valid session, user needs to login
        console.log("[Auth] No valid session found");
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  /**
   * Listen for automatic logout (e.g., refresh token expired)
   */
  useEffect(() => {
    const cleanup = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, ({ reason }) => {
      console.log("[Auth] Logout event received:", reason);

      // Clear state
      setIsAuthenticated(false);
      setUser(null);

      // Redirect to login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    });

    return cleanup;
  }, []);

  /**
   * Login with email/password via backend Keycloak proxy
   */
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
        credentials: "include", // Important: receive HttpOnly cookie
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Login failed" }));
        throw new Error(error.message || "Invalid credentials");
      }

      const data = await response.json();
      const { accessToken, user: userData, expiresIn } = data;

      // Store access token in memory
      tokenManager.setAccessToken(accessToken, expiresIn);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      // Emit login event for MFEs
      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, {
        user: userData,
        timestamp: Date.now(),
      });

      console.log("[Auth] Login successful");
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout - Clear tokens and session
   */
  const logout = async () => {
    setIsLoading(true);

    try {
      // Call backend to clear HttpOnly cookie and revoke Keycloak session
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear in-memory token
      tokenManager.clear();

      // Update state
      setIsAuthenticated(false);
      setUser(null);

      // Emit logout event for MFEs
      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "user_initiated",
      });

      console.log("[Auth] Logout successful");
    } catch (error) {
      console.error("[Auth] Logout error:", error);
      // Clear state anyway
      tokenManager.clear();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get current access token (for API calls)
   */
  const getAccessToken = () => {
    return tokenManager.getAccessToken();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Decode JWT payload without verification
 * We trust the backend to validate tokens
 */
function decodeJWTPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return {};

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    console.error("[Auth] Failed to decode JWT:", error);
    return {};
  }
}
