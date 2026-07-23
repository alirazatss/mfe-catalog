/**
 * @mfe-runtine/auth-ui — Corporate branding tokens.
 *
 * Framework-agnostic. Consumed by React components in this package AND by
 * pure-vanilla shells that want to style their static login route.
 *
 * See ADR-0003 (Login as Package) and openspec/changes/extract-auth-ui-package/.
 */

export interface AuthTheme {
  colors: {
    /** Primary action color (buttons, focus rings) */
    primary: string;
    /** Primary color on hover */
    primaryHover: string;
    /** Page background */
    background: string;
    /** Card / form container background */
    surface: string;
    /** Body text */
    text: string;
    /** Subdued text (labels, hints) */
    textMuted: string;
    /** Input border color */
    border: string;
    /** Error color for inline messages */
    error: string;
  };
  fonts: {
    body: string;
    heading: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  /** Data URL for the default corporate logo (placeholder) */
  logo: string;
}

/**
 * Default corporate placeholder logo — replace via prop overrides for real shells.
 */
const DEFAULT_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 120 32">
      <rect x="0" y="4" width="24" height="24" rx="6" fill="currentColor"/>
      <text x="32" y="22" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="currentColor">MF Mono</text>
    </svg>`,
  );

export const theme: AuthTheme = {
  colors: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    background: "#f9fafb",
    surface: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#d1d5db",
    error: "#dc2626",
  },
  fonts: {
    body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    heading: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  logo: DEFAULT_LOGO,
};

/**
 * Convert theme values into CSS custom properties suitable for spreading into
 * a `style={{}}` object on the outermost auth-ui element. See LoginPage.
 */
export function themeToCssVars(theme: AuthTheme): Record<string, string> {
  return {
    "--auth-primary": theme.colors.primary,
    "--auth-primary-hover": theme.colors.primaryHover,
    "--auth-background": theme.colors.background,
    "--auth-surface": theme.colors.surface,
    "--auth-text": theme.colors.text,
    "--auth-text-muted": theme.colors.textMuted,
    "--auth-border": theme.colors.border,
    "--auth-error": theme.colors.error,
    "--auth-font-body": theme.fonts.body,
    "--auth-font-heading": theme.fonts.heading,
    "--auth-radius-sm": theme.radii.sm,
    "--auth-radius-md": theme.radii.md,
    "--auth-radius-lg": theme.radii.lg,
  };
}
