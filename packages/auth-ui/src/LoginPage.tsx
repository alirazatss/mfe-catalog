import { useState, useMemo, useRef, useEffect, type FormEvent } from "react";
import { tokenManager } from "@mfe-runtine/auth";
import { emitMFEEvent, MFE_EVENTS } from "@mfe-runtine/events";
import { theme as defaultTheme, themeToCssVars, type AuthTheme } from "./theme.js";
import { userFromToken } from "./utils/jwt.js";
import type {
  AdditionalField,
  LoginSuccessPayload,
  OnLoginError,
  OnLoginSuccess,
  User,
} from "./types.js";

export interface LoginPageProps {
  /** Corporate logo URL. Falls back to bundled placeholder. */
  logo?: string;
  /** Primary button/color override (only overrides the primary token). */
  primaryColor?: string;
  /** Full theme override (takes precedence over `primaryColor`). */
  theme?: Partial<AuthTheme>;
  /** Additional form fields posted to the login endpoint. */
  additionalFields?: AdditionalField[];
  /** Social sign-in providers to render as separate buttons. */
  socialProviders?: Array<"google" | "sso" | "microsoft" | "github">;
  /** Callback invoked when login succeeds. */
  onLoginSuccess?: OnLoginSuccess;
  /** Callback invoked when login fails. */
  onLoginError?: OnLoginError;
  /** Callback invoked when the user clicks a social provider button. */
  onSocialLogin?: (provider: string) => void;
  /** Link URL for the "Forgot password?" link. Empty string hides the link. */
  forgotPasswordUrl?: string;
  /** Override the page title. Defaults to "Sign in". */
  title?: string;
}

interface LoginResponse {
  accessToken: string;
  user?: User;
  expiresIn?: number;
}

type ErrorState = { kind: "invalid" | "locked" | "unknown"; message: string } | null;

/**
 * LoginPage — corporate-branded login form.
 *
 * Uses `TokenManager` from `@mfe-runtine/auth` for state; POSTs to `/api/auth/login`.
 * Does NOT persist credentials or tokens in localStorage.
 */
export function LoginPage(props: LoginPageProps): JSX.Element {
  const {
    logo,
    primaryColor,
    theme: themeOverride,
    additionalFields = [],
    socialProviders = [],
    onLoginSuccess,
    onLoginError,
    onSocialLogin,
    forgotPasswordUrl = "/forgot-password",
    title = "Sign in",
  } = props;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const mergedTheme = useMemo<AuthTheme>(() => {
    const merged: AuthTheme = {
      ...defaultTheme,
      ...themeOverride,
      colors: { ...defaultTheme.colors, ...themeOverride?.colors },
      fonts: { ...defaultTheme.fonts, ...themeOverride?.fonts },
      radii: { ...defaultTheme.radii, ...themeOverride?.radii },
      spacing: { ...defaultTheme.spacing, ...themeOverride?.spacing },
    };
    if (primaryColor) merged.colors.primary = primaryColor;
    return merged;
  }, [themeOverride, primaryColor]);

  const wrapperStyle = useMemo(
    () => ({
      ...themeToCssVars(mergedTheme),
      minHeight: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: mergedTheme.spacing.xl,
      background: "var(--auth-background)",
      fontFamily: "var(--auth-font-body)",
      color: "var(--auth-text)",
    }),
    [mergedTheme],
  );

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("returnUrl");
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { email, password };
      for (const field of additionalFields) {
        body[field.name] = extraValues[field.name] ?? "";
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (response.status === 401) {
        setError({ kind: "invalid", message: "Invalid email or password." });
        setPassword("");
        emailInputRef.current?.focus();
        return;
      }

      if (response.status === 423) {
        setError({
          kind: "locked",
          message: "Your account is locked. Please reset your password.",
        });
        return;
      }

      if (!response.ok) {
        let detail = `Login failed (HTTP ${response.status})`;
        try {
          const payload = await response.json();
          if (payload?.code === "account_locked") {
            setError({ kind: "locked", message: "Your account is locked." });
            return;
          }
          if (payload?.message) detail = payload.message;
        } catch {
          // Non-JSON body — keep the generic detail
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as LoginResponse;
      tokenManager.setAccessToken(data.accessToken, data.expiresIn);

      const user: User = data.user ??
        (userFromToken(data.accessToken) as User | null) ?? {
          id: "",
          email,
          name: email,
          roles: [],
        };

      emitMFEEvent(MFE_EVENTS.AUTH_LOGIN, { user, timestamp: Date.now() });

      const payload: LoginSuccessPayload = { user, returnUrl };
      onLoginSuccess?.(payload);
    } catch (err) {
      const asError = err instanceof Error ? err : new Error(String(err));
      setError({ kind: "unknown", message: asError.message });
      onLoginError?.(asError);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <div style={wrapperStyle} data-testid="login-page">
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: mergedTheme.spacing.xl,
          background: "var(--auth-surface)",
          borderRadius: "var(--auth-radius-lg)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: mergedTheme.spacing.lg }}>
          <img
            src={logo ?? mergedTheme.logo}
            alt="Logo"
            style={{ height: "40px", display: "inline-block" }}
          />
        </div>

        <h1
          style={{
            margin: 0,
            marginBottom: mergedTheme.spacing.lg,
            fontFamily: "var(--auth-font-heading)",
            fontSize: "1.5rem",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {title}
        </h1>

        {error ? (
          <div
            role="alert"
            data-testid="login-error"
            style={{
              marginBottom: mergedTheme.spacing.md,
              padding: mergedTheme.spacing.sm,
              borderRadius: "var(--auth-radius-sm)",
              background: "rgba(220, 38, 38, 0.08)",
              color: "var(--auth-error)",
              fontSize: "0.875rem",
            }}
          >
            {error.message}
            {error.kind === "locked" && forgotPasswordUrl ? (
              <>
                {" "}
                <a href={forgotPasswordUrl} style={{ color: "var(--auth-error)" }}>
                  Reset password
                </a>
              </>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <label style={labelStyle(mergedTheme)}>
            <span>Email</span>
            <input
              ref={emailInputRef}
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle(mergedTheme)}
            />
          </label>

          <label style={labelStyle(mergedTheme)}>
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle(mergedTheme)}
            />
          </label>

          {additionalFields.map((field) => (
            <label key={field.name} style={labelStyle(mergedTheme)}>
              <span>{field.label}</span>
              <input
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                placeholder={field.placeholder}
                value={extraValues[field.name] ?? ""}
                onChange={(e) =>
                  setExtraValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                }
                style={inputStyle(mergedTheme)}
              />
            </label>
          ))}

          <button
            type="submit"
            disabled={submitting}
            data-testid="login-submit"
            style={{
              marginTop: mergedTheme.spacing.md,
              width: "100%",
              padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
              background: submitting ? "var(--auth-text-muted)" : "var(--auth-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--auth-radius-md)",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {forgotPasswordUrl ? (
          <p
            style={{ textAlign: "center", marginTop: mergedTheme.spacing.md, fontSize: "0.875rem" }}
          >
            <a href={forgotPasswordUrl} style={{ color: "var(--auth-primary)" }}>
              Forgot password?
            </a>
          </p>
        ) : null}

        {socialProviders.length > 0 ? (
          <div
            style={{
              marginTop: mergedTheme.spacing.md,
              display: "flex",
              flexDirection: "column",
              gap: mergedTheme.spacing.sm,
            }}
          >
            {socialProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => onSocialLogin?.(provider)}
                data-testid={`social-${provider}`}
                style={{
                  padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
                  background: "transparent",
                  color: "var(--auth-text)",
                  border: `1px solid var(--auth-border)`,
                  borderRadius: "var(--auth-radius-md)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Continue with {providerLabel(provider)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function labelStyle(t: AuthTheme): React.CSSProperties {
  return {
    display: "block",
    marginBottom: t.spacing.md,
    fontSize: "0.875rem",
    color: "var(--auth-text)",
  };
}

function inputStyle(t: AuthTheme): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    marginTop: t.spacing.xs,
    padding: `${t.spacing.sm} ${t.spacing.md}`,
    border: `1px solid var(--auth-border)`,
    borderRadius: "var(--auth-radius-md)",
    background: "var(--auth-surface)",
    color: "var(--auth-text)",
    fontSize: "1rem",
    boxSizing: "border-box",
  };
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "google":
      return "Google";
    case "sso":
      return "SSO";
    case "microsoft":
      return "Microsoft";
    case "github":
      return "GitHub";
    default:
      return provider;
  }
}
