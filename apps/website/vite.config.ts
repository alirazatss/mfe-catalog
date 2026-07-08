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
        remoteWidget: {
          type: "module",
          name: "remoteWidget",
          entry: getRemoteUrl("VITE_REMOTE_WIDGET_URL", "http://localhost:5174/remoteEntry.js"),
          entryGlobalName: "remoteWidget",
          shareScope: "default",
        },
      },
      shared: {
        // No shared dependencies for vanilla TypeScript
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
