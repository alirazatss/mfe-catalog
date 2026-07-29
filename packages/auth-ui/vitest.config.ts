import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "@mfe-runtime/auth-ui",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        "dist/**",
        "node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.ts",
        "**/test/**",
        "src/index.ts",
        "src/bridge/index.ts",
      ],
    },
  },
});
