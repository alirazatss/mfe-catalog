import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

export default defineConfig({
  plugins: [
    federation({
      name: "widget", // Module Federation scope name
      filename: "remoteEntry.js",
      exposes: {
        "./CounterWidget": "./src/components/CounterWidget.ts",
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^19" },
        "react-dom": { singleton: true, requiredVersion: "^19" },
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
