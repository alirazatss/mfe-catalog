import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "host",
      remotes: {
        remoteWidget: {
          type: "module",
          name: "remoteWidget",
          entry: "http://localhost:5174/remoteEntry.js",
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
