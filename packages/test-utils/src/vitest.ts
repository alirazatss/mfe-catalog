/**
 * @mfe-runtime/test-utils — Vitest config preset
 *
 * Implements shared-test-utils / Vitest config preset.
 * See openspec/changes/shared-boilerplate-packages/specs/shared-test-utils/spec.md
 *
 * Provides repo-standard vitest configuration with customizable overrides.
 */

import type { UserConfig } from "vite-plus";

export interface VitestConfigOptions {
  /**
   * Optional coverage thresholds override
   */
  coverageThresholds?: {
    statements?: number;
    branches?: number;
    functions?: number;
    lines?: number;
  };

  /**
   * Optional setup file path
   */
  setupFile?: string;

  /**
   * Optional test name for reporting
   */
  name?: string;
}

/**
 * Create standard Vitest configuration preset.
 *
 * Provides repo-standard test configuration with:
 * - happy-dom environment
 * - v8 coverage provider
 * - text/json/html reporters
 * - Standard exclusions
 * - Customizable coverage thresholds and setup files
 *
 * @param options - Optional configuration overrides
 * @returns Vitest UserConfig
 *
 * @example
 * ```ts
 * import { defineConfig } from "vite-plus";
 * import { createVitestConfig } from "@mfe-runtime/test-utils/vitest";
 *
 * export default defineConfig(
 *   createVitestConfig({
 *     name: "my-mfe",
 *     coverageThresholds: {
 *       statements: 90,
 *       branches: 85,
 *     },
 *   })
 * );
 * ```
 */
export function createVitestConfig(options?: VitestConfigOptions): UserConfig {
  const { coverageThresholds, setupFile, name } = options || {};

  return {
    test: {
      ...(name && { name }),
      environment: "happy-dom",
      globals: true,
      ...(setupFile && { setupFiles: [setupFile] }),
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: [
          "dist/**",
          "node_modules/**",
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.config.ts",
          "**/test/**",
        ],
        ...(coverageThresholds && {
          thresholds: {
            statements: coverageThresholds.statements ?? 80,
            branches: coverageThresholds.branches ?? 75,
            functions: coverageThresholds.functions ?? 80,
            lines: coverageThresholds.lines ?? 80,
          },
        }),
      },
    },
  };
}
