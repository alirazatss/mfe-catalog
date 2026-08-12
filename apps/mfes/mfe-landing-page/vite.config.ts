import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { getResolvedPortFromPackage } from "@mfe-runtime/monorepo-tools";

// Implements REQ-001, REQ-002, REQ-003, REQ-004: Use resolved port from canonical map
// See openspec/changes/local-port-map-for-mfe-development/specs/local-port-mapping/spec.md
const PORT = getResolvedPortFromPackage(import.meta.url, 5175);

export default defineConfig({
  // Relative base so built asset URLs work when hosted under a nested blob path.
  base: "./",
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
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tailwindcss(),
    federation({
      name: "landingPage",
      filename: "remoteEntry.js",
      // Map bundled CSS to every expose so the shell injects styles
      // when loading this remote (populates cssAssetMap in remoteEntry).
      bundleAllCSS: true,
      exposes: {
        "./lifecycle": "./src/bootstrap.ts",
        "./bootstrap": "./src/bootstrap.ts",
        "./LandingPage": "./src/bootstrap.ts",
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
    // CSS code splitting is required so the federation plugin can map CSS
    // to exposed modules (cssAssetMap) and inject it when the shell loads the remote.
    cssCodeSplit: true,
  },
});
