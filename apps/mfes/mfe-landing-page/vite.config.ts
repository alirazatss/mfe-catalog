import { defineConfig } from "vite-plus";
import { federation } from "@module-federation/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
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
    port: 5175,
    origin: "http://localhost:5175",
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },
  preview: {
    port: 5175,
  },
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
  },
});
