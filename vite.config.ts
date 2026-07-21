import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{ts,tsx}": (filenames) => {
      const testFiles = filenames.filter((f) => f.includes(".test.") || f.includes("__tests__"));
      const vitestConfigs = filenames.filter((f) => f.includes("vitest.config.ts"));
      const srcFiles = filenames.filter(
        (f) => !f.includes(".test.") && !f.includes("__tests__") && !f.includes("vitest.config.ts"),
      );

      const commands = [];
      if (srcFiles.length > 0) {
        commands.push(`vp check --fix ${srcFiles.join(" ")}`);
      }
      if (testFiles.length > 0) {
        commands.push(`vp fmt ${testFiles.join(" ")}`);
      }
      if (vitestConfigs.length > 0) {
        commands.push(`vp fmt ${vitestConfigs.join(" ")}`);
      }
      return commands;
    },
    "!*.{ts,tsx}": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    ignorePatterns: ["**/src/_legacy/**"],
  },
  run: {
    cache: true,
  },
});
