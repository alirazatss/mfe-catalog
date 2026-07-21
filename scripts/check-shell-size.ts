#!/usr/bin/env node
/**
 * Enforce the thin-shell size ceiling.
 *
 * Counts non-blank, non-comment lines in the shell runtime source
 * (`apps/website/src/**\/*.ts` excluding `_legacy/`, `test/`, and `*.d.ts`).
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
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHELL_LINE_LIMIT = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const searchRoot = path.join(rootDir, "apps/website/src");

const excludeDirs = new Set(["_legacy", "test"]);

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

const files = walk(searchRoot).sort();
let total = 0;
const perFile: Array<[string, number]> = [];

for (const file of files) {
  const count = countCodeLines(readFileSync(file, "utf-8"));
  perFile.push([path.relative(rootDir, file), count]);
  total += count;
}

console.log(`Shell runtime line count: ${total} (limit: ${SHELL_LINE_LIMIT})`);
for (const [file, count] of perFile) {
  console.log(`  ${count.toString().padStart(4)}  ${file}`);
}

if (total > SHELL_LINE_LIMIT) {
  console.error(
    `\n❌ Shell size ${total} exceeds limit ${SHELL_LINE_LIMIT}. Shell must stay thin.\n` +
      `Move logic into MFEs or shared packages.`,
  );
  process.exit(1);
}

console.log(`\n✅ Shell within budget (${SHELL_LINE_LIMIT - total} lines headroom)`);
