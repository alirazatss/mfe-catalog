/// <reference types="vite/client" />
import { emitMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";
import type { RefreshResponse } from "./types";

/**
 * Token Manager
 *
 * Manages Keycloak access tokens in memory (XSS safe).
 * Refresh tokens are automatically sent via HttpOnly cookies.
 *
 * Features:
 * - In-memory access token storage
 * - Auto-refresh at 80% token lifetime
 * - Singleton pattern (one instance across app)
 * - Event emission on refresh/logout
 */
class TokenManager {
  private accessToken: string | null = null;
  private refreshTimer: number | null = null;
  private refreshPromise: Promise<void> | null = null; // Deduplicate simultaneous refreshes

  /**
   * Set access token and schedule auto-refresh
   * @param token - JWT access token from backend
   * @param expiresIn - Token lifetime in seconds (optional, will decode from JWT if not provided)
   */
  setAccessToken(token: string, expiresIn?: number): void {
    this.accessToken = token;

    // Calculate token expiration
    let expiresAtMs: number;

    if (expiresIn) {
      // Use provided expiration
      expiresAtMs = Date.now() + expiresIn * 1000;
    } else {
      // Decode JWT to get expiration
      try {
        const decoded = this.decodeJWT(token);
        expiresAtMs = decoded.exp * 1000; // Convert to milliseconds
      } catch (error) {
        console.error("[TokenManager] Failed to decode JWT:", error);
        return;
      }
    }

    // Schedule refresh at 80% lifetime
    this.scheduleRefresh(expiresAtMs);
  }

  /**
   * Get current access token
   * @returns Access token or null if not authenticated
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Check if user is authenticated
   * @returns True if access token exists
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Clear tokens and cancel refresh timer
   * Called on logout or refresh failure
   */
  clear(): void {
    this.accessToken = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshPromise = null;
  }

  /**
   * Schedule automatic token refresh at 80% lifetime
   * @param expiresAtMs - Token expiration timestamp in milliseconds
   */
  private scheduleRefresh(expiresAtMs: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const now = Date.now();
    const lifetime = expiresAtMs - now;
    const refreshAt = now + lifetime * 0.8; // 80% lifetime
    const delay = refreshAt - now;

    if (delay <= 0) {
      // Token already expired or very close, refresh immediately
      void this.refreshToken();
      return;
    }

    this.refreshTimer = window.setTimeout(() => {
      void this.refreshToken();
    }, delay);

    if (import.meta.env.DEV) {
      const refreshDate = new Date(refreshAt).toLocaleTimeString();
      console.log(
        `[TokenManager] Token refresh scheduled at ${refreshDate} (${Math.round(delay / 1000)}s from now)`,
      );
    }
  }

  /**
   * Refresh access token via backend
   * Backend automatically reads refresh token from HttpOnly cookie
   *
   * Deduplicates simultaneous refresh requests
   */
  async refreshToken(): Promise<void> {
    // Deduplicate simultaneous refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh API call
   */
  private async performRefresh(): Promise<void> {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include", // Send HttpOnly cookie with refresh token
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data: RefreshResponse = await response.json();

      // Update access token
      this.setAccessToken(data.accessToken, data.expiresIn);

      // Emit refresh event for MFEs
      emitMFEEvent(MFE_EVENTS.AUTH_REFRESH, {
        newToken: data.accessToken,
        expiresAt: data.expiresIn ? Date.now() + data.expiresIn * 1000 : undefined,
      });

      if (import.meta.env.DEV) {
        console.log("[TokenManager] Token refreshed successfully");
      }
    } catch (error) {
      console.error("[TokenManager] Token refresh failed:", error);

      // Clear tokens
      this.clear();

      // Emit logout event (triggers redirect to login)
      emitMFEEvent(MFE_EVENTS.AUTH_LOGOUT, {
        reason: "refresh_failed",
      });
    }
  }

  /**
   * Decode JWT payload without verification
   * We trust the backend to validate the token
   *
   * @param token - JWT token
   * @returns Decoded payload
   */
  private decodeJWT(token: string): { exp: number; [key: string]: any } {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = parts[1];
    // Base64URL decode
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  }
}

/**
 * Singleton instance
 * Exported for use across shell and MFEs
 */
export const tokenManager = new TokenManager();
