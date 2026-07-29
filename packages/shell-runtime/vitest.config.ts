import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "@mfe-runtine/shell-runtime",
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 55,
        branches: 48,
        functions: 62,
        lines: 56,
      },
      exclude: ["dist/**", "node_modules/**", "**/*.test.ts", "**/*.config.ts", "**/fixtures/**"],
    },
  },
});
