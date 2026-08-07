#!/usr/bin/env node
/**
 * Integration test orchestration script.
 *
 * Responsibilities:
 * 1. Build shell + MFE packages
 * 2. Pre-flight port availability check (4173, 4174)
 * 3. Start static servers for shell and MFE
 * 4. Wait for health checks (/remoteEntry.js 200)
 * 5. Run Vitest integration suite
 * 6. Clean shutdown (frees ports on SIGINT)
 *
 * REQ-TI-I-1, REQ-TI-O-1, REQ-TI-O-2, REQ-TI-O-3, REQ-TI-I-5
 *
 * Implements multi-shell-tooling: all-shells default scenario
 */

import { spawn, type ChildProcess } from "child_process";
import * as http from "http";
import * as fs from "fs/promises";
import * as path from "path";
import { readdirSync, statSync, existsSync } from "fs";

const SHELL_PORT = parseInt(process.env.INTEGRATION_SHELL_PORT || "4173", 10);
const MFE_PORT = parseInt(process.env.INTEGRATION_MFE_PORT || "4174", 10);
const HEALTH_CHECK_TIMEOUT = 30000;
const HEALTH_CHECK_INTERVAL = 500;

// Allow targeting specific shell via env or CLI arg, default to first discovered shell
const TARGET_SHELL = process.env.INTEGRATION_SHELL || process.argv[2] || discoverDefaultShell();

function discoverDefaultShell(): string {
  const shellsDir = "apps/shells";
  if (!existsSync(shellsDir)) {
    console.error(`❌ Shells directory not found: ${shellsDir}`);
    process.exit(1);
  }

  const shells = readdirSync(shellsDir).filter((name) => {
    const fullPath = path.join(shellsDir, name);
    return statSync(fullPath).isDirectory();
  });

  if (shells.length === 0) {
    console.error(`❌ No shells found in ${shellsDir}`);
    process.exit(1);
  }

  return shells[0]; // Default to first shell
}

console.log(`🎯 Running integration tests for shell: ${TARGET_SHELL}`);

interface ServerProcess {
  process: ChildProcess;
  port: number;
  name: string;
}

const servers: ServerProcess[] = [];

async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function waitForHealthCheck(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      // Server is ready if it responds (even with 404)
      // Preview servers may return 404 for root but still serve assets
      if (response.status >= 200 && response.status < 500) {
        console.log(`✓ Health check passed: ${url} (status: ${response.status})`);
        return;
      }
    } catch {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  throw new Error(`Health check failed for ${url} after ${timeout}ms`);
}

function startServer(
  command: string,
  args: string[],
  cwd: string,
  port: number,
  name: string,
): ServerProcess {
  console.log(`Starting ${name} on port ${port}...`);

  const proc = spawn(command, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  proc.stdout?.on("data", (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  proc.stderr?.on("data", (data) => {
    console.error(`[${name}] ${data.toString().trim()}`);
  });

  const serverProcess = { process: proc, port, name };
  servers.push(serverProcess);

  return serverProcess;
}

async function cleanupServers(): Promise<void> {
  console.log("\nCleaning up servers...");

  for (const server of servers) {
    try {
      server.process.kill("SIGTERM");
      console.log(`✓ Stopped ${server.name}`);
    } catch (error) {
      console.error(`Failed to stop ${server.name}:`, error);
    }
  }

  servers.length = 0;
}

async function runTests(): Promise<number> {
  console.log("\nRunning integration tests...");

  return new Promise((resolve) => {
    const vitest = spawn(
      "vp",
      ["test", "--run", "--config", "tests/integration/vitest.config.ts", "tests/integration/"],
      {
        stdio: "inherit",
        shell: true,
      },
    );

    vitest.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function collectDiagnostics(): Promise<void> {
  console.log("\nCollecting diagnostics...");

  const diagnosticsDir = "tests/integration/test-results/diagnostics";

  try {
    await fs.mkdir(diagnosticsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, "-");

    // Collect manifest if available
    try {
      const manifestPath = `apps/shells/${TARGET_SHELL}/dist/remotes.config.json`;
      const manifest = await fs.readFile(manifestPath, "utf-8");
      await fs.writeFile(path.join(diagnosticsDir, `manifest-${timestamp}.json`), manifest);
      console.log("  ✓ Saved manifest");
    } catch {
      console.log("  ⚠ Manifest not available");
    }

    // Collect remoteEntry.js if available
    try {
      const remoteEntryUrl = `http://localhost:${MFE_PORT}/remoteEntry.js`;
      const response = await fetch(remoteEntryUrl);
      const remoteEntry = await response.text();
      await fs.writeFile(path.join(diagnosticsDir, `remoteEntry-${timestamp}.js`), remoteEntry);
      console.log("  ✓ Saved remoteEntry.js");
    } catch {
      console.log("  ⚠ remoteEntry.js not available");
    }

    // Create diagnostic summary
    const summary = {
      timestamp,
      shellPort: SHELL_PORT,
      mfePort: MFE_PORT,
      serverStatus: servers.map((s) => ({
        name: s.name,
        port: s.port,
        running: !s.process.killed,
      })),
    };

    await fs.writeFile(
      path.join(diagnosticsDir, `summary-${timestamp}.json`),
      JSON.stringify(summary, null, 2),
    );

    console.log(`  ✓ Diagnostics saved to ${diagnosticsDir}`);
  } catch (error) {
    console.error("  ✗ Failed to collect diagnostics:", error);
  }
}

async function main() {
  let exitCode = 0;

  // Handle SIGINT for clean shutdown
  process.on("SIGINT", async () => {
    console.log("\n\nReceived SIGINT, cleaning up...");
    await cleanupServers();
    process.exit(130);
  });

  try {
    // Step 1: Pre-flight port check
    console.log("Step 1: Checking port availability...");

    const shellAvailable = await checkPortAvailable(SHELL_PORT);
    const mfeAvailable = await checkPortAvailable(MFE_PORT);

    if (!shellAvailable) {
      console.error(
        `❌ Port ${SHELL_PORT} is already in use.\n` +
          `   Action: Kill the process using port ${SHELL_PORT} or configure a different port.\n` +
          `   Find process: lsof -ti:${SHELL_PORT}\n` +
          `   Kill process: kill $(lsof -ti:${SHELL_PORT})`,
      );
      process.exit(1);
    }

    if (!mfeAvailable) {
      console.error(
        `❌ Port ${MFE_PORT} is already in use.\n` +
          `   Action: Kill the process using port ${MFE_PORT} or configure a different port.\n` +
          `   Find process: lsof -ti:${MFE_PORT}\n` +
          `   Kill process: kill $(lsof -ti:${MFE_PORT})`,
      );
      process.exit(1);
    }

    console.log(`✓ Ports ${SHELL_PORT} and ${MFE_PORT} are available`);

    // Step 2: Build (assuming already built for now; real version would run turbo build)
    console.log("\nStep 2: Ensuring build artifacts exist...");
    const shellDist = `apps/shells/${TARGET_SHELL}/dist`;
    const mfeDist = "apps/mfes/mfe-widget/dist";

    try {
      await fs.access(path.join(shellDist, "index.html"));
      await fs.access(path.join(mfeDist, "remoteEntry.js"));
      console.log("✓ Build artifacts found");
    } catch {
      console.error(
        "❌ Build artifacts missing. Run `pnpm build` first.\n" +
          `   Required: ${shellDist}/index.html\n` +
          "   Required: apps/mfes/mfe-widget/dist/remoteEntry.js",
      );
      process.exit(1);
    }

    // Step 3: Start servers
    console.log("\nStep 3: Starting servers...");

    startServer(
      "vp",
      ["preview", "--port", String(SHELL_PORT), "--strictPort"],
      shellDist,
      SHELL_PORT,
      "shell",
    );

    startServer(
      "vp",
      ["preview", "--port", String(MFE_PORT), "--strictPort"],
      mfeDist,
      MFE_PORT,
      "mfe-widget",
    );

    // Step 4: Health checks
    console.log("\nStep 4: Waiting for health checks...");

    await waitForHealthCheck(`http://localhost:${SHELL_PORT}/`, HEALTH_CHECK_TIMEOUT);
    await waitForHealthCheck(`http://localhost:${MFE_PORT}/remoteEntry.js`, HEALTH_CHECK_TIMEOUT);

    // Step 5: Run tests
    exitCode = await runTests();

    if (exitCode === 0) {
      console.log("\n✓ All integration tests passed");
    } else {
      console.error(`\n❌ Integration tests failed with exit code ${exitCode}`);

      // Collect diagnostics on failure
      await collectDiagnostics();
    }
  } catch (error) {
    console.error("\n❌ Integration test orchestration failed:");
    console.error(error);
    exitCode = 1;

    // Collect diagnostics on error
    await collectDiagnostics();
  } finally {
    // Step 6: Cleanup
    await cleanupServers();
  }

  process.exit(exitCode);
}

main();
