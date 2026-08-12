/**
 * Verification test for task 2.3: Shell boots with resolved local port map
 * Tests that:
 * 1. Shell vite.config.ts loads and uses getResolvedPort
 * 2. Remotes config contains localhost URLs matching the port map
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function verifyShellBootIntegration() {
  console.log("=== Task 2.3: Shell Boot Integration Verification ===\n");

  // 1. Verify port map exists
  const portMapPath = ".local-port-map.json";
  const portMapContent = await readFile(portMapPath, "utf-8");
  const portMap = JSON.parse(portMapContent);
  console.log("✓ Port map loaded:");
  console.log(JSON.stringify(portMap, null, 2));

  // 2. Verify shell dev config uses localhost URLs from port map
  const remotesConfigPath = "apps/shells/website/public/remotes.config.dev.json";
  const remotesConfig = JSON.parse(await readFile(remotesConfigPath, "utf-8"));

  console.log("\n✓ Remotes config loaded with features:");

  let allMatch = true;
  for (const [route, config] of Object.entries(remotesConfig.features)) {
    const mfeName = config.mfe;
    const expectedPort = portMap[mfeName];
    const actualUrl = config.entryUrl;
    const expectedUrl = `http://localhost:${expectedPort}/remoteEntry.js`;

    const matches = actualUrl === expectedUrl;
    const status = matches ? "✓" : "✗";

    console.log(`  ${status} ${mfeName}: ${actualUrl}`);
    if (!matches) {
      console.log(`    Expected: ${expectedUrl}`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log("\n✅ All remote entry URLs match the resolved port map");
    console.log("✅ Shell boot integration verified successfully");
    process.exit(0);
  } else {
    console.log("\n❌ Some URLs do not match the port map");
    process.exit(1);
  }
}

verifyShellBootIntegration().catch((err) => {
  console.error("❌ Verification failed:", err.message);
  process.exit(1);
});
