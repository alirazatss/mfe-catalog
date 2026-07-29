#!/usr/bin/env tsx
/**
 * Assert that test files do not contain arbitrary sleep/delay patterns
 * outside a fake-timer context.
 *
 * Exits non-zero if hard-coded delays are found.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function findTestFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "coverage") {
        continue;
      }
      findTestFiles(fullPath, files);
    } else if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

// Patterns that indicate arbitrary sleeps (not using fake timers)
const SLEEP_PATTERNS = [
  // new Promise(resolve => setTimeout(resolve, N))
  /new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout\s*\(\s*(?:resolve|r)\s*,\s*\d+/,
  // await new Promise(...)
  /await\s+new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout/,
  // Direct setTimeout without vi.useFakeTimers context (harder to detect perfectly)
  // We'll flag setTimeout with numeric literals but allow vi.advanceTimersByTime
];

async function main() {
  const testFiles = findTestFiles(ROOT);

  console.log(`Scanning ${testFiles.length} test files for arbitrary sleeps...\n`);

  const violations: Array<{ file: string; line: number; pattern: string }> = [];

  for (const file of testFiles) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    // Check if file uses fake timers
    const usesFakeTimers = /vi\.useFakeTimers\(\)/.test(content);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of SLEEP_PATTERNS) {
        if (pattern.test(line)) {
          // If the file uses fake timers and has advanceTimersByTime, it's OK
          if (usesFakeTimers && /vi\.advanceTimersByTime/.test(content)) {
            continue;
          }

          violations.push({
            file: file.replace(ROOT + "/", ""),
            line: i + 1,
            pattern: line.trim(),
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("❌ Found arbitrary sleep patterns in test files:\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    ${v.pattern}\n`);
    }
    console.error(`\n${violations.length} violation(s) found.`);
    console.error("\nTests should use vi.useFakeTimers() + vi.advanceTimersByTime()");
    console.error("or Testing Library's waitFor() with explicit conditions.\n");
    process.exit(1);
  }

  console.log(`✓ No arbitrary sleeps found in ${testFiles.length} test files.`);
}

main();
