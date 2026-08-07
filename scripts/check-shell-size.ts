#!/usr/bin/env node
/**
 * Enforce the thin-shell size ceiling.
 *
 * Counts non-blank, non-comment lines in shell runtime source.
 *
 * Target ceiling: currently 500 lines. See notes below.
 *
 * History:
 *   - Original spec target: 250 lines (thin-shell-bootstrap capability)
 *   - MVP reality (this change): mostly because `shell/mfe-mount.ts` ships a
 *     React-legacy adapter to keep the existing `mfe-widget` (which exposes
 *     `./App` as a React component) working during the migration.
 *   - After `mfe-lifecycle-contract` change: the React adapter is removed and
 *     the ceiling should drop back to ~250. Update SHELL_LINE_LIMIT then.
 *
 * Implements multi-shell-tooling: size-check scenarios
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHELL_LINE_LIMIT = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const excludeDirs = new Set(["_legacy", "test"]);

function parseArgs(): string[] {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: tsx scripts/check-shell-size.ts [shell-name]

Arguments:
  shell-name    Name of shell to check (e.g., website, ccis)
                If omitted, checks all shells in apps/shells/*

Examples:
  tsx scripts/check-shell-size.ts website
  tsx scripts/check-shell-size.ts          # checks all shells
`);
    process.exit(0);
  }

  return args;
}

function getShellsToCheck(args: string[]): string[] {
  if (args.length > 0) {
    // Check specific shell(s) passed as arguments
    return args;
  }

  // Default to all shells in apps/shells/*
  const shellsDir = path.join(rootDir, "apps/shells");
  if (!existsSync(shellsDir)) {
    console.error(`❌ Shells directory not found: ${shellsDir}`);
    process.exit(1);
  }

  const allShells = readdirSync(shellsDir).filter((name) => {
    const fullPath = path.join(shellsDir, name);
    return statSync(fullPath).isDirectory();
  });

  return allShells;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (excludeDirs.has(name)) continue;
      walk(full, out);
    } else if (
      /\.(ts|tsx)$/.test(name) &&
      !name.endsWith(".d.ts") &&
      !name.endsWith(".test.ts") &&
      !name.endsWith(".test.tsx")
    ) {
      out.push(full);
    }
  }
  return out;
}

function countCodeLines(contents: string): number {
  let count = 0;
  let inBlockComment = false;
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }

    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      continue;
    }

    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("*/")) {
      continue;
    }

    count++;
  }
  return count;
}

function checkShellSize(shellName: string): {
  total: number;
  passed: boolean;
  files: Array<[string, number]>;
} {
  const searchRoot = path.join(rootDir, `apps/shells/${shellName}/src`);

  if (!existsSync(searchRoot)) {
    console.error(`❌ Shell source not found: ${searchRoot}`);
    return { total: 0, passed: false, files: [] };
  }

  const files = walk(searchRoot).sort();
  let total = 0;
  const perFile: Array<[string, number]> = [];

  for (const file of files) {
    const count = countCodeLines(readFileSync(file, "utf-8"));
    perFile.push([path.relative(rootDir, file), count]);
    total += count;
  }

  const passed = total <= SHELL_LINE_LIMIT;
  return { total, passed, files: perFile };
}

const args = parseArgs();
const shellsToCheck = getShellsToCheck(args);

console.log(`📊 Checking shell size for ${shellsToCheck.length} shell(s)...\n`);

let allPassed = true;
const results: Array<{ shell: string; total: number; passed: boolean }> = [];

for (const shellName of shellsToCheck) {
  console.log(`🔍 Checking shell: ${shellName}`);
  const result = checkShellSize(shellName);

  if (result.total === 0) {
    allPassed = false;
    continue;
  }

  results.push({ shell: shellName, total: result.total, passed: result.passed });

  console.log(`   Shell runtime line count: ${result.total} (limit: ${SHELL_LINE_LIMIT})`);
  for (const [file, count] of result.files) {
    console.log(`     ${count.toString().padStart(4)}  ${file}`);
  }

  if (result.passed) {
    console.log(`   ✅ Within budget (${SHELL_LINE_LIMIT - result.total} lines headroom)\n`);
  } else {
    console.log(`   ❌ Exceeds limit by ${result.total - SHELL_LINE_LIMIT} lines\n`);
    allPassed = false;
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`Summary: Checked ${results.length} shell(s)`);
for (const { shell, total, passed } of results) {
  const status = passed ? "✅" : "❌";
  console.log(`  ${status} ${shell}: ${total}/${SHELL_LINE_LIMIT} lines`);
}

if (!allPassed) {
  console.error(
    `\n❌ One or more shells exceed the size limit.\n` +
      `Move logic into MFEs or shared packages to keep shells thin.`,
  );
  process.exit(1);
}

console.log(`\n✅ All shells within budget!`);
