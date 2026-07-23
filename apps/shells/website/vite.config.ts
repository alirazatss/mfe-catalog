import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

// Get remote URLs from environment variables with fallback to localhost
const getRemoteUrl = (envVar: string, fallback: string): string => {
  return process.env[envVar] || fallback;
};

export default defineConfig({
  plugins: [
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
