import { defineConfig } from "tsdown";

/**
 * Multi-entry build so consumers can tree-shake by importing subpaths:
 *   - `@mfe-runtime/auth-ui`         → full React UI (LoginPage, AuthProvider, etc.)
 *   - `@mfe-runtime/auth-ui/bridge`  → framework-agnostic window.__MFE_AUTH__ setup
 *   - `@mfe-runtime/auth-ui/theme`   → design tokens only (no React)
 */
export default defineConfig({
  entry: ["src/index.ts", "src/bridge/index.ts", "src/theme.ts"],
  format: "esm",
  dts: true,
  clean: true,
  external: ["react", "react-dom", "react-router", "react/jsx-runtime"],
});
