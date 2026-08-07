// Implements app-scaffolding: run summary requirement
// See openspec/changes/mfe-shell-scaffolding/specs/app-scaffolding/spec.md

/**
 * Print a summary of files created/modified and manual follow-ups
 *
 * Implements app-scaffolding: run summary scenario
 */
export function printSummary(options) {
  const { type, name, filesCreated, filesModified, manualSteps, metadata } = options;

  console.log("\n");
  console.log("━".repeat(60));
  console.log(`✅ ${type.toUpperCase()} scaffolded: ${name}`);
  console.log("━".repeat(60));

  if (metadata) {
    console.log("\n📋 Metadata:");
    for (const [key, value] of Object.entries(metadata)) {
      console.log(`   ${key}: ${value}`);
    }
  }

  if (filesCreated.length > 0) {
    console.log("\n📁 Files created:");
    for (const file of filesCreated) {
      console.log(`   ✓ ${file}`);
    }
  }

  if (filesModified.length > 0) {
    console.log("\n✏️  Files modified:");
    for (const file of filesModified) {
      console.log(`   ✓ ${file}`);
    }
  }

  if (manualSteps.length > 0) {
    console.log("\n📝 Manual steps:");
    for (let i = 0; i < manualSteps.length; i++) {
      console.log(`   ${i + 1}. ${manualSteps[i]}`);
    }
  }

  console.log("\n" + "━".repeat(60));
  console.log("\n");
}
