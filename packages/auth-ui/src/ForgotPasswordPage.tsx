import { useState, useMemo, type FormEvent } from "react";
import { theme as defaultTheme, themeToCssVars, type AuthTheme } from "./theme.js";

export interface ForgotPasswordPageProps {
  /**
   * Caller-provided handler for the password-reset request.
   * Should resolve on success and reject on failure.
   */
  onSubmit: (email: string) => Promise<void>;
  /** Full theme override. */
  theme?: Partial<AuthTheme>;
  /** Custom title. */
  title?: string;
  /** URL to return to the login flow. */
  loginUrl?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

/**
 * ForgotPasswordPage — email input for password reset requests.
 * Delegates the actual reset call to the caller via `onSubmit`.
 */
export function ForgotPasswordPage({
  onSubmit,
  theme,
  title = "Reset your password",
  loginUrl = "/login",
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      await onSubmit(email);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div
      style={{
        ...themeToCssVars(mergedTheme),
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: mergedTheme.spacing.xl,
        background: "var(--auth-background)",
        fontFamily: "var(--auth-font-body)",
        color: "var(--auth-text)",
      }}
    >
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
        <h1
          style={{
            margin: 0,
            marginBottom: mergedTheme.spacing.lg,
            fontSize: "1.5rem",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {title}
        </h1>

        {status === "success" ? (
          <div role="status" data-testid="forgot-success">
            <p>Check your email for a link to reset your password.</p>
            <a href={loginUrl} style={{ color: "var(--auth-primary)" }}>
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {status === "error" ? (
              <div
                role="alert"
                data-testid="forgot-error"
                style={{
                  marginBottom: mergedTheme.spacing.md,
                  padding: mergedTheme.spacing.sm,
                  background: "rgba(220, 38, 38, 0.08)",
                  color: "var(--auth-error)",
                  borderRadius: "var(--auth-radius-sm)",
                  fontSize: "0.875rem",
                }}
              >
                {errorMessage || "Something went wrong. Please try again."}
              </div>
            ) : null}

            <label style={{ display: "block", marginBottom: mergedTheme.spacing.md }}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: mergedTheme.spacing.xs,
                  padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
                  border: `1px solid var(--auth-border)`,
                  borderRadius: "var(--auth-radius-md)",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <button
              type="submit"
              disabled={status === "submitting"}
              data-testid="forgot-submit"
              style={{
                marginTop: mergedTheme.spacing.md,
                width: "100%",
                padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
                background: "var(--auth-primary)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--auth-radius-md)",
                fontSize: "1rem",
                cursor: status === "submitting" ? "wait" : "pointer",
              }}
            >
              {status === "submitting" ? "Sending…" : "Send reset link"}
            </button>

            <p
              style={{
                textAlign: "center",
                marginTop: mergedTheme.spacing.md,
                fontSize: "0.875rem",
              }}
            >
              <a href={loginUrl} style={{ color: "var(--auth-primary)" }}>
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
