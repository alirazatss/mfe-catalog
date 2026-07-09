import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "widget", // Module Federation scope name
      filename: "remoteEntry.js",
      exposes: {
        "./CounterWidget": "./src/components/CounterWidget.ts",
      },
      shared: {
        // No shared dependencies for vanilla TypeScript
        // If using libraries like lodash, add them here
      },
    }),
  ],
  server: {
    port: 5174,
    origin: "http://localhost:5174",
  },
  preview: {
    port: 5174,
  },
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
