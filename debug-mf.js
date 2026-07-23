#!/usr/bin/env node

/**
 * Script to test Module Federation remoteEntry.js
 * Fetches the remoteEntry.js and validates its structure
 */

async function fetchURL(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function main() {
  console.log("🧪 Module Federation remoteEntry.js Debug\n");

  try {
    console.log("📥 Fetching http://localhost:5174/remoteEntry.js...");
    const remoteEntry = await fetchURL("http://localhost:5174/remoteEntry.js");

    console.log(`✅ Fetched ${remoteEntry.length} bytes\n`);

    // Check for key patterns
    const checks = [
      ["Module Federation runtime", /__mf/],
      ["widget scope declaration", /widget|scope/],
      ["shared modules", /shared|share/],
      ["remote modules", /remote|exposes/],
      ["init function", /init|__mf_init/],
      ["async code", /async|await|Promise/],
      ["Module cache", /moduleCache|__mf_module_cache/],
    ];

    console.log("📋 Content Analysis:");
    for (const [check, regex] of checks) {
      const found = regex.test(remoteEntry);
      const icon = found ? "✅" : "❌";
      console.log(`  ${icon} ${check}`);
    }

    // Print first 500 chars (formatted)
    console.log("\n📄 First 500 characters:");
    console.log("---");
    console.log(remoteEntry.substring(0, 500));
    console.log("---");

    // Check for error patterns
    console.log("\n🔍 Error Pattern Check:");
    if (remoteEntry.includes("error") || remoteEntry.includes("Error")) {
      console.log("  ⚠️  Contains 'Error' keyword");
    } else {
      console.log("  ✅ No obvious error patterns");
    }

    // Check file size
    console.log(`\n📊 File size: ${(remoteEntry.length / 1024).toFixed(2)} KB`);

    if (remoteEntry.length < 500) {
      console.log("❌ remoteEntry.js seems too small - might not be correct");
      process.exit(1);
    } else {
      console.log("✅ remoteEntry.js looks valid");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\n💡 Is the MFE dev server running?");
    console.error("   Try: pnpm turbo dev --filter '@mfe-runtine/mfe-widget'");
    process.exit(1);
  }
}

main();
