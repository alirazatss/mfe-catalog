import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "@mfe-runtine/dynamic-loader",
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 78,
        branches: 65,
        functions: 89,
        lines: 77,
      },
      exclude: [
        "dist/**",
        "node_modules/**",
        "**/*.test.ts",
        "**/*.config.ts",
        "**/test/**",
        "**/__tests__/**",
      ],
    },
  },
});
