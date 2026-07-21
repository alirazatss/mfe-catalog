import { useMemo } from "react";
import { theme as defaultTheme, themeToCssVars, type AuthTheme } from "./theme.js";

export interface SessionExpiredPageProps {
  /** URL for the "Sign in again" CTA (default: "/login"). */
  loginUrl?: string;
  /** Custom title. */
  title?: string;
  /** Custom body copy. */
  message?: string;
  /** Full theme override. */
  theme?: Partial<AuthTheme>;
}

/**
 * SessionExpiredPage — full-page notice shown when the user's session cannot
 * be refreshed. Presents a single CTA back to the login flow.
 */
export function SessionExpiredPage({
  loginUrl = "/login",
  title = "Session expired",
  message = "For your security, we've signed you out. Please sign in again to continue.",
  theme,
}: SessionExpiredPageProps): JSX.Element {
  const mergedTheme = useMemo<AuthTheme>(
    () => ({
      ...defaultTheme,
      ...theme,
      colors: { ...defaultTheme.colors, ...theme?.colors },
      fonts: { ...defaultTheme.fonts, ...theme?.fonts },
      radii: { ...defaultTheme.radii, ...theme?.radii },
      spacing: { ...defaultTheme.spacing, ...theme?.spacing },
    }),
    [theme],
  );

  return (
    <div
      role="alert"
      style={{
        ...themeToCssVars(mergedTheme),
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: mergedTheme.spacing.xl,
        fontFamily: "var(--auth-font-body)",
        color: "var(--auth-text)",
      }}
    >
      <div style={{ maxWidth: "420px", textAlign: "center" }}>
        <h1
          style={{
            margin: 0,
            marginBottom: mergedTheme.spacing.md,
            fontFamily: "var(--auth-font-heading)",
            fontSize: "1.5rem",
            fontWeight: 600,
          }}
        >
          {title}
        </h1>
        <p style={{ color: "var(--auth-text-muted)", marginBottom: mergedTheme.spacing.lg }}>
          {message}
        </p>
        <a
          href={loginUrl}
          data-testid="session-expired-cta"
          style={{
            display: "inline-block",
            padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.lg}`,
            background: "var(--auth-primary)",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "var(--auth-radius-md)",
          }}
        >
          Sign in again
        </a>
      </div>
    </div>
  );
}
