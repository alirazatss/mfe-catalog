import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    name: "@mf-mono/auth-ui",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
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
