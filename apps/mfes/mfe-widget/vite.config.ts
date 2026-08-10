import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";
import { getResolvedPortFromPackage } from "@mfe-runtime/monorepo-tools";

// Implements REQ-001, REQ-002, REQ-003, REQ-004: Use resolved port from canonical map
// See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md
const PORT = getResolvedPortFromPackage(import.meta.url, 5174);

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
    port: PORT,
    origin: `http://localhost:${PORT}`,
  },
  preview: {
    port: PORT,
  },
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
