import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: ["dist/**", "**/*.config.ts", "**/*.test.ts", "**/test/**", "schema.json"],
    },
  },
});
