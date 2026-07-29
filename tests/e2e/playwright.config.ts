import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 *
 * Features:
 * - Chromium only (cross-browser deferred to CI expansion)
 * - Cross-origin testing via host rules (shell.test, cdn.test)
 * - Screenshot/trace/video on failure
 * - Console error → test failure
 * - Two projects: default (mocked auth) + auth-stub (real auth server)
 *
 * REQ-TI-E-1, REQ-TI-E-5, REQ-TI-E-6, REQ-TI-O-2, REQ-TI-O-3
 */

const SHELL_PORT = process.env.E2E_SHELL_PORT || 4273;
const MFE_PORT = process.env.E2E_MFE_PORT || 4274;
const AUTH_STUB_PORT = process.env.E2E_AUTH_PORT || 4275;

export default defineConfig({
  testDir: "./journeys",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // Run serially for now to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/test-results/html" }],
    ["json", { outputFile: "tests/e2e/test-results/results.json" }],
  ],
  use: {
    baseURL: `http://localhost:${SHELL_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Cross-origin host rules
    launchOptions: {
      args: [
        `--host-rules=MAP shell.test localhost:${SHELL_PORT}`,
        `--host-rules=MAP cdn.test localhost:${MFE_PORT}`,
      ],
    },
  },

  projects: [
    {
      name: "chromium-mocked-auth",
      use: {
        ...devices["Desktop Chrome"],
        // Mocked auth injected via fixtures
      },
    },
    {
      name: "chromium-auth-stub",
      use: {
        ...devices["Desktop Chrome"],
        // Real auth stub server (started in webServer)
      },
    },
  ],

  // Web servers for shell + MFE
  webServer: [
    {
      command: `cd ../../apps/shells/website && vp preview --port ${SHELL_PORT} --strictPort`,
      port: Number(SHELL_PORT),
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `cd ../../apps/mfes/mfe-widget && vp preview --port ${MFE_PORT} --strictPort`,
      port: Number(MFE_PORT),
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `tsx servers/auth-stub.ts`,
      port: Number(AUTH_STUB_PORT),
      timeout: 10000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
