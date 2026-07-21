import { useMemo } from "react";
import { theme as defaultTheme, themeToCssVars, type AuthTheme } from "./theme.js";

export interface LogoutPageProps {
  /** Called when user confirms logout. */
  onConfirm: () => void | Promise<void>;
  /** Called when user cancels the logout dialog. */
  onCancel?: () => void;
  /** Full theme override. */
  theme?: Partial<AuthTheme>;
  /** Custom title. */
  title?: string;
  /** Custom body copy. */
  message?: string;
}

/**
 * LogoutPage — confirmation dialog for the logout flow.
 *
 * A small modal component. Callers render it inside a modal container.
 */
export function LogoutPage({
  onConfirm,
  onCancel,
  theme,
  title = "Sign out?",
  message = "You'll need to sign in again to access your account.",
}: LogoutPageProps): JSX.Element {
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      style={{
        ...themeToCssVars(mergedTheme),
        maxWidth: "400px",
        margin: "0 auto",
        padding: mergedTheme.spacing.xl,
        background: "var(--auth-surface)",
        borderRadius: "var(--auth-radius-lg)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)",
        fontFamily: "var(--auth-font-body)",
        color: "var(--auth-text)",
      }}
    >
      <h2
        id="logout-title"
        style={{
          margin: 0,
          marginBottom: mergedTheme.spacing.md,
          fontFamily: "var(--auth-font-heading)",
          fontSize: "1.25rem",
          fontWeight: 600,
        }}
      >
        {title}
      </h2>
      <p style={{ marginTop: 0, color: "var(--auth-text-muted)" }}>{message}</p>
      <div
        style={{
          marginTop: mergedTheme.spacing.lg,
          display: "flex",
          gap: mergedTheme.spacing.sm,
          justifyContent: "flex-end",
        }}
      >
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            data-testid="logout-cancel"
            style={{
              padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
              background: "transparent",
              color: "var(--auth-text)",
              border: `1px solid var(--auth-border)`,
              borderRadius: "var(--auth-radius-md)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void onConfirm()}
          data-testid="logout-confirm"
          style={{
            padding: `${mergedTheme.spacing.sm} ${mergedTheme.spacing.md}`,
            background: "var(--auth-primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--auth-radius-md)",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
