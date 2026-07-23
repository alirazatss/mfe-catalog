/**
 * @mfe-runtine/auth-ui
 *
 * Corporate-branded auth UI components for shells consuming Keycloak-backed auth.
 *
 * Subpath imports:
 *   - `@mfe-runtine/auth-ui`         → full React UI (LoginPage, AuthProvider, etc.)
 *   - `@mfe-runtine/auth-ui/bridge`  → framework-agnostic window.__MFE_AUTH__ setup
 *   - `@mfe-runtine/auth-ui/theme`   → design tokens (no React dependency)
 *
 * See:
 * - docs/adr/0002-authentication-ownership.md
 * - docs/adr/0003-login-as-package.md
 * - openspec/changes/extract-auth-ui-package/
 */

export { LoginPage, type LoginPageProps } from "./LoginPage.js";
export { LogoutPage, type LogoutPageProps } from "./LogoutPage.js";
export { SessionExpiredPage, type SessionExpiredPageProps } from "./SessionExpiredPage.js";
export { ForgotPasswordPage, type ForgotPasswordPageProps } from "./ForgotPasswordPage.js";
export { AuthProvider, useAuth, type AuthContextValue } from "./AuthProvider.js";
export { ProtectedRoute, type ProtectedRouteProps } from "./ProtectedRoute.js";
export { theme, themeToCssVars, type AuthTheme } from "./theme.js";
export type {
  AdditionalField,
  LoginCredentials,
  LoginSuccessPayload,
  OnLoginError,
  OnLoginSuccess,
  User,
} from "./types.js";
