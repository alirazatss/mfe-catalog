import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getResolvedPort } from "@mfe-runtime/monorepo-tools";
import type { Plugin } from "vite-plus";

// Implements REQ-001, REQ-003, REQ-004: Use resolved port from canonical map
// See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md
const PORT = getResolvedPort("website", 5173);

// Implements SDP-Requirement-5 (env-correct config bundled)
// Select environment-specific remote config at build time.
// Reads DEPLOY_ENV env var (dev|prod) and copies the appropriate
// remotes.config.<env>.json to remotes.config.json in dist.
const DEPLOY_ENV = process.env.DEPLOY_ENV || "dev";

export default defineConfig({
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
    // Implements ESRC-3: Serve local override manifest in dev mode
    {
      name: "serve-local-remote-config",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/remotes.config.json") {
            const localOverride = resolve(__dirname, "remotes.config.local.json");
            const devConfig = resolve(__dirname, "config/remotes.config.dev.json");

            let configPath: string;
            let source: string;

            if (existsSync(localOverride)) {
              configPath = localOverride;
              source = "local override";
              console.log("ℹ️ Local override active: remotes.config.local.json");
            } else {
              configPath = devConfig;
              source = "dev config";
            }

            try {
              const content = readFileSync(configPath, "utf-8");
              res.setHeader("Content-Type", "application/json");
              res.setHeader("X-Config-Source", source);
              res.end(content);
            } catch (error) {
              res.statusCode = 500;
              res.end(`Failed to load remote config from ${configPath}: ${error}`);
            }
          } else {
            next();
          }
        });
      },
    } as Plugin,
    // Implements AAR-2: Copy app-config schema into dist
    {
      name: "copy-app-config-schema",
      closeBundle() {
        const sourceFile = resolve(__dirname, "../../../packages/app-config/schema.json");
        const destFile = resolve(__dirname, "dist/app-config.schema.json");

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
    // Implements ESRC-1, ESRC-2: Copy env-specific remote config from config/ dir at build time
    {
      name: "copy-env-remote-config",
      closeBundle() {
        const sourceFile = resolve(__dirname, `config/remotes.config.${DEPLOY_ENV}.json`);
        const destFile = resolve(__dirname, "dist/remotes.config.json");

        if (!existsSync(sourceFile)) {
          throw new Error(
            `Environment-specific remote config not found: ${sourceFile}\n` +
              `DEPLOY_ENV=${DEPLOY_ENV} requires config/remotes.config.${DEPLOY_ENV}.json`,
          );
        }

        copyFileSync(sourceFile, destFile);
        console.log(`✓ Copied remotes.config.${DEPLOY_ENV}.json → dist/remotes.config.json`);
      },
    },
    federation({
      name: "host",
      remotes: {
        // NOTE: Static remote configuration (fallback only)
        // The host now uses dynamic loader to load remotes from remotes.config.json
        // This static config is kept as a fallback and for reference
        // To enable static config: uncomment the block below
        /*
        mfeWidget: {
          type: "module",
          name: "mfeWidget",
          entry: getRemoteUrl("VITE_REMOTE_WIDGET_URL", "http://localhost:5174/remoteEntry.js"),
          entryGlobalName: "mfeWidget",
          shareScope: "default",
        },
        */
      },
      shared: {
        // No shared dependencies for vanilla TypeScript
        // Add shared dependencies here if using React, Vue, etc.
      },
    }),
  ],
  server: {
    port: PORT,
    origin: `http://localhost:${PORT}`,
  },
  preview: {
    port: PORT,
  },
});
