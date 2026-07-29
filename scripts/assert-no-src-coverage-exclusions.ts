#!/usr/bin/env node
/**
 * Assert that no vitest.config.ts file excludes production code (src/**)
 * from coverage reports.
 *
 * REQ-TI-C-4: Prohibit arbitrary coverage exclusions for production code.
 */

import * as fs from "fs/promises";
import * as path from "path";

interface Violation {
  file: string;
  excludedPattern: string;
}

async function findVitestConfigs(dir: string): Promise<string[]> {
  const results: string[] = [];
  const packagesDir = path.join(dir, "packages");

  try {
    const packages = await fs.readdir(packagesDir);

    for (const pkg of packages) {
      const configPath = path.join(packagesDir, pkg, "vitest.config.ts");
      try {
        await fs.access(configPath);
        results.push(path.relative(dir, configPath));
      } catch {
        // No vitest.config.ts in this package
      }
    }
  } catch {
    // packages/ doesn't exist
  }

  return results;
}

async function main() {
  const configFiles = await findVitestConfigs(process.cwd());

  const violations: Violation[] = [];

  for (const file of configFiles) {
    const content = await fs.readFile(file, "utf-8");

    // Check for coverage.exclude patterns that match src/**
    const excludeMatch = content.match(/coverage:\s*{[^}]*exclude:\s*\[([\s\S]*?)\]/m);

    if (excludeMatch) {
      const excludeList = excludeMatch[1];

      // Look for patterns that exclude src/** paths
      const srcPatterns = excludeList.match(/"[^"]*src\/[^"]*"/g) || [];

      for (const pattern of srcPatterns) {
        const cleanPattern = pattern.replace(/"/g, "");

        // Allowed exceptions: test files, type definitions
        const isAllowed =
          cleanPattern.includes("__tests__") ||
          cleanPattern.includes(".test.") ||
          cleanPattern.includes(".spec.") ||
          cleanPattern.endsWith(".d.ts");

        if (!isAllowed) {
          violations.push({
            file,
            excludedPattern: cleanPattern,
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("\n❌ Coverage exclusion violations found:\n");
    for (const v of violations) {
      console.error(`  ${v.file}`);
      console.error(`    Excluded: ${v.excludedPattern}`);
    }
    console.error(
      "\nProduction code (src/**) must not be excluded from coverage.\nRemove the exclusion or move the code to a non-src directory.\n",
    );
    process.exit(1);
  }

  console.log("✅ No production code excluded from coverage");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
