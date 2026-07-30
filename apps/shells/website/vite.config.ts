import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";
import { copyFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

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
    // Implements SDP-Requirement-5: Copy env-specific remote config at build time
    {
      name: "copy-env-remote-config",
      closeBundle() {
        const sourceFile = resolve(__dirname, `public/remotes.config.${DEPLOY_ENV}.json`);
        const destFile = resolve(__dirname, "dist/remotes.config.json");

        if (!existsSync(sourceFile)) {
          throw new Error(
            `Environment-specific remote config not found: ${sourceFile}\n` +
              `DEPLOY_ENV=${DEPLOY_ENV} requires remotes.config.${DEPLOY_ENV}.json`,
          );
        }

        copyFileSync(sourceFile, destFile);
        console.log(`✓ Copied remotes.config.${DEPLOY_ENV}.json → dist/remotes.config.json`);

        // Remove env-specific configs from dist (they're copied by Vite's publicDir handling)
        // We only want the selected remotes.config.json in the final artifact
        const envConfigs = ["dev", "prod"];
        for (const env of envConfigs) {
          const envFile = resolve(__dirname, `dist/remotes.config.${env}.json`);
          if (existsSync(envFile)) {
            unlinkSync(envFile);
          }
        }
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
    port: 5173,
    origin: "http://localhost:5173",
  },
  preview: {
    port: 5173,
  },
});
