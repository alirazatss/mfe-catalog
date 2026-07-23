import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "@mfe-runtine/events",
    environment: "happy-dom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: ["dist/**", "node_modules/**", "**/*.test.ts", "**/*.config.ts", "**/test/**"],
    },
  },
});
