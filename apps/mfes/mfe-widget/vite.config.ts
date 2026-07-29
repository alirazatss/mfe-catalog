import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";

export default defineConfig({
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
  plugins: [
    federation({
      name: "widget", // Module Federation scope name
      filename: "remoteEntry.js",
      exposes: {
        "./lifecycle": "./src/bootstrap.ts",
        "./bootstrap": "./src/bootstrap.ts",
        "./App": "./src/bootstrap.ts",
        "./CounterWidget": "./src/bootstrap.ts",
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
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
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
