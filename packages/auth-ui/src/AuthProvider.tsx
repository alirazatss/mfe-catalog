import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { tokenManager } from "@mfe-runtime/auth";
import { emitMFEEvent, onMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";
import type { LoginCredentials, User } from "./types.js";
import { userFromToken } from "./utils/jwt.js";

/**
 * Values exposed by `useAuth()`.
 */
export interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider — React context wrapper around the singleton TokenManager.
 *
 * Optional for shells: pure vanilla shells populate `window.__MFE_AUTH__`
 * via `setupAuthBridge` instead. Use this provider only if some part of the
 * shell still renders React and wants a `useAuth()` hook.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    tokenManager.isAuthenticated(),
  );
  const [user, setUser] = useState<User | null>(
    () => (userFromToken(tokenManager.getAccessToken()) as User | null) ?? null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Prevent StrictMode double-init in dev
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      try {
        await tokenManager.refreshToken();
        const token = tokenManager.getAccessToken();
        if (token) {
          setUser((userFromToken(token) as User | null) ?? null);
          setIsAuthenticated(true);
        }
      } catch {
        // No valid session — user needs to sign in.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Sync provider state to auth events emitted from anywhere (other MFEs, tokenManager auto-refresh).
  useEffect(() => {
    const cleanupLogin = onMFEEvent(MFE_EVENTS.AUTH_LOGIN, (payload: { user?: User }) => {
      if (payload?.user) setUser(payload.user);
      setIsAuthenticated(true);
    });
    const cleanupRefresh = onMFEEvent(MFE_EVENTS.AUTH_REFRESH, () => {
      const token = tokenManager.getAccessToken();
      setUser((userFromToken(token) as User | null) ?? null);
      setIsAuthenticated(Boolean(token));
    });
    const cleanupLogout = onMFEEvent(MFE_EVENTS.AUTH_LOGOUT, () => {
      setUser(null);
      setIsAuthenticated(false);
    });
    return () => {
      cleanupLogin();
      cleanupRefresh();
      cleanupLogout();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.message ?? `Login failed (HTTP ${response.status})`);
      }
      const data = await response.json();
      tokenManager.setAccessToken(data.accessToken, data.expiresIn);
      const nextUser: User = data.user ??
        (userFromToken(data.accessToken) as User | null) ?? {
          id: "",
          email: credentials.email,
          name: credentials.email,
          roles: [],
        };
      setUser(nextUser);
      setIsAuthenticated(true);
      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { user: nextUser, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    } finally {
      tokenManager.clear();
      setIsAuthenticated(false);
      setUser(null);
      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, { reason: "user_initiated" });
      setIsLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(() => tokenManager.getAccessToken(), []);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be called inside <AuthProvider>");
  }
  return ctx;
}
