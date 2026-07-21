import { describe, it, expect } from "vite-plus/test";
import { theme, themeToCssVars } from "./theme.js";

describe("theme", () => {
  it("exposes required color tokens", () => {
    expect(theme.colors.primary).toBeTruthy();
    expect(theme.colors.background).toBeTruthy();
    expect(theme.colors.error).toBeTruthy();
  });

  it("provides a default logo data URL", () => {
    expect(theme.logo.startsWith("data:image/svg+xml")).toBe(true);
  });
});

describe("themeToCssVars", () => {
  it("emits expected CSS custom properties", () => {
    const vars = themeToCssVars(theme);
    expect(vars["--auth-primary"]).toBe(theme.colors.primary);
    expect(vars["--auth-error"]).toBe(theme.colors.error);
    expect(vars["--auth-radius-md"]).toBe(theme.radii.md);
  });
});
