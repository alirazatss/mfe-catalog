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
    "!*.{ts,tsx}": (filenames) => {
      const workflowYamlFiles = filenames.filter((f) => /^\.github\/workflows\/.*\.ya?ml$/.test(f));
      const nonWorkflowFiles = filenames.filter((f) => !/^\.github\/workflows\/.*\.ya?ml$/.test(f));

      const commands = [];
      if (nonWorkflowFiles.length > 0) {
        commands.push(`vp check --fix ${nonWorkflowFiles.join(" ")}`);
      }
      if (workflowYamlFiles.length > 0) {
        commands.push(
          "echo 'Skipping workflow YAML in vp staged due to parser bug; validate workflows in CI.'",
        );
      }
      return commands;
    },
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
