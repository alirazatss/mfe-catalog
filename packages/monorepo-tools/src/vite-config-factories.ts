/**
 * @mfe-runtime/monorepo-tools — Vite Config Factories
 *
 * Implements build-config-factories / MFE Vite config factory and Shell Vite config factory.
 * See openspec/changes/shared-boilerplate-packages/specs/build-config-factories/spec.md
 *
 * Provides standard Vite config factories for MFEs and shells to eliminate boilerplate
 * and ensure consistent build configuration across the monorepo.
 */

import type { UserConfig, Plugin } from "vite";
import { federation } from "@module-federation/vite";
import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

export interface MFEViteConfigOptions {
  /**
   * Module Federation scope name (e.g., "widget", "landingPage")
   */
  name: string;

  /**
   * Dev server port
   */
  port: number;

  /**
   * Module Federation exposes map
   */
  exposes: Record<string, string>;

  /**
   * Optional additional Vite plugins (e.g., tailwind)
   */
  plugins?: Plugin[];

  /**
   * CSS code splitting strategy (default: false)
   */
  cssCodeSplit?: boolean;

  /**
   * Bundle all CSS into single file (default: false)
   */
  bundleAllCSS?: boolean;
}

/**
 * Create standard MFE Vite configuration.
 *
 * Produces Module Federation remote config with:
 * - Federation plugin with shared React singletons
 * - Single optimizeDeps block (no duplicates)
 * - Standard remoteEntry.js filename
 * - ESNext build target
 *
 * @param options - MFE configuration options
 * @returns Vite UserConfig
 *
 * @example
 * ```ts
 * import { defineConfig } from "vite-plus";
 * import { createMFEViteConfig } from "@mfe-runtime/monorepo-tools";
 *
 * export default defineConfig(
 *   createMFEViteConfig({
 *     name: "widget",
 *     port: 5174,
 *     exposes: {
 *       "./lifecycle": "./src/bootstrap.ts",
 *     },
 *   })
 * );
 * ```
 */
export function createMFEViteConfig(options: MFEViteConfigOptions): UserConfig {
  const { name, port, exposes, plugins = [], cssCodeSplit = false, bundleAllCSS = false } = options;

  return {
    plugins: [
      ...plugins,
      federation({
        name,
        filename: "remoteEntry.js",
        exposes,
        shared: {
          react: { singleton: true, requiredVersion: "^18 || ^19" },
          "react-dom": { singleton: true, requiredVersion: "^18 || ^19" },
        },
      }),
    ],
    optimizeDeps: {
      exclude: [
        "@mfe-runtime/auth",
        "@mfe-runtime/dynamic-loader",
        "@mfe-runtime/events",
        "@mfe-runtime/remote-config",
        "@mfe-runtime/shell-runtime",
      ],
      include: ["react", "react-dom", "react-dom/client"],
    },
    server: {
      port,
      origin: `http://localhost:${port}`,
    },
    preview: {
      port,
    },
    build: {
      target: "esnext",
      minify: false,
      cssCodeSplit,
      ...(bundleAllCSS && {
        rollupOptions: {
          output: {
            assetFileNames: "assets/[name].[ext]",
          },
        },
      }),
    },
  };
}

export interface ShellViteConfigOptions {
  /**
   * Shell name (e.g., "website")
   */
  shell: string;

  /**
   * Deployment environment (e.g., "dev", "prod")
   */
  deployEnv?: string;
}

/**
 * Create standard Shell Vite configuration.
 *
 * Produces host config with:
 * - Asset copy behavior (app-config schema, env-specific remote config)
 * - Environment-driven config selection
 * - Federation host setup
 *
 * @param options - Shell configuration options
 * @returns Vite UserConfig
 *
 * @example
 * ```ts
 * import { defineConfig } from "vite-plus";
 * import { createShellViteConfig } from "@mfe-runtime/monorepo-tools";
 *
 * export default defineConfig(
 *   createShellViteConfig({
 *     shell: "website",
 *     deployEnv: process.env.DEPLOY_ENV || "dev",
 *   })
 * );
 * ```
 */
export function createShellViteConfig(options: ShellViteConfigOptions): UserConfig {
  const { shell, deployEnv = process.env.DEPLOY_ENV || "dev" } = options;

  return {
    optimizeDeps: {
      exclude: [
        "@mfe-runtime/auth",
        "@mfe-runtime/dynamic-loader",
        "@mfe-runtime/events",
        "@mfe-runtime/remote-config",
        "@mfe-runtime/shell-runtime",
      ],
    },
    plugins: [
      // Copy app-config schema into dist
      {
        name: "copy-app-config-schema",
        closeBundle() {
          const sourceFile = resolve(process.cwd(), "../../../packages/app-config/schema.json");
          const destFile = resolve(process.cwd(), "dist/app-config.schema.json");

          if (!existsSync(sourceFile)) {
            throw new Error(
              `App config schema not found: ${sourceFile}\n` +
                `Run: pnpm --filter @mfe-runtime/app-config build`,
            );
          }

          copyFileSync(sourceFile, destFile);
          console.log(`✓ Copied app-config schema.json → dist/app-config.schema.json`);
        },
      },
      // Copy env-specific remote config at build time
      {
        name: "copy-env-remote-config",
        closeBundle() {
          const sourceFile = resolve(process.cwd(), `public/remotes.config.${deployEnv}.json`);
          const destFile = resolve(process.cwd(), "dist/remotes.config.json");

          if (!existsSync(sourceFile)) {
            throw new Error(
              `Environment-specific remote config not found: ${sourceFile}\n` +
                `DEPLOY_ENV=${deployEnv} requires remotes.config.${deployEnv}.json`,
            );
          }

          copyFileSync(sourceFile, destFile);
          console.log(`✓ Copied remotes.config.${deployEnv}.json → dist/remotes.config.json`);

          // Remove env-specific configs from dist
          const envConfigs = ["dev", "prod"];
          for (const env of envConfigs) {
            const envFile = resolve(process.cwd(), `dist/remotes.config.${env}.json`);
            if (existsSync(envFile)) {
              unlinkSync(envFile);
            }
          }
        },
      },
      federation({
        name: "host",
        remotes: {},
        shared: {
          react: { singleton: true, requiredVersion: "^18 || ^19" },
          "react-dom": { singleton: true, requiredVersion: "^18 || ^19" },
        },
      }),
    ],
    server: {
      port: 5173,
    },
    preview: {
      port: 5173,
    },
    build: {
      target: "esnext",
    },
  };
}
