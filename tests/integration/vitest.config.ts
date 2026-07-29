import { defineConfig } from "vite-plus";
import path from "path";

/**
 * Integration test configuration for runtime MFE loading.
 *
 * Uses Node environment (not happy-dom) to allow real HTTP servers.
 * No Module Federation mocks—exercises the real loader and lifecycle.
 *
 * Coverage is merged with unit tests via root coverage merge script.
 */
export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    testTimeout: 30000, // Allow time for server startup
    hookTimeout: 10000,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/fixtures/**"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["../../packages/dynamic-loader/src/**", "../../packages/shell-runtime/src/**"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        "**/node_modules/**",
      ],
      all: true,
      // No thresholds here—integration tests contribute to per-package totals
    },
  },
  resolve: {
    alias: {
      "@mfe-runtime/dynamic-loader": path.resolve(__dirname, "../../packages/dynamic-loader/src"),
      "@mfe-runtime/shell-runtime": path.resolve(__dirname, "../../packages/shell-runtime/src"),
      "@mfe-runtime/remote-config": path.resolve(__dirname, "../../packages/remote-config/src"),
    },
  },
});
