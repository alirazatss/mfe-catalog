#!/usr/bin/env tsx
/**
 * Assert that all qualifying packages have a `test` script.
 * Exits non-zero with a diagnostic if any are missing.
 *
 * Implements multi-shell-tooling: all-shells default scenario
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

// Discover all shells in apps/shells/*
function discoverShells(): string[] {
  const shellsDir = join(ROOT, "apps/shells");
  if (!existsSync(shellsDir)) {
    console.warn(`⚠️  Shells directory not found: ${shellsDir}`);
    return [];
  }

  return readdirSync(shellsDir)
    .filter((name) => {
      const fullPath = join(shellsDir, name);
      return statSync(fullPath).isDirectory();
    })
    .map((name) => `apps/shells/${name}`);
}

// Base packages that must have a test script
const BASE_PACKAGES = [
  "packages/auth",
  "packages/auth-ui",
  "packages/dynamic-loader",
  "packages/events",
  "packages/monorepo-tools",
  "packages/remote-config",
  "packages/shell-runtime",
  "packages/utils",
  "apps/mfes/mfe-widget",
];

// Packages that must have a test script (base + all discovered shells)
const REQUIRED_PACKAGES = [...BASE_PACKAGES, ...discoverShells()];

const missing: string[] = [];

for (const pkgPath of REQUIRED_PACKAGES) {
  const packageJsonPath = join(ROOT, pkgPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    console.error(`❌ Package not found: ${pkgPath}`);
    missing.push(pkgPath);
    continue;
  }

  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

  if (!pkg.scripts?.test) {
    console.error(`❌ Missing 'test' script: ${pkgPath}`);
    missing.push(pkgPath);
  } else {
    console.log(`✓ ${pkgPath}`);
  }
}

if (missing.length > 0) {
  console.error(`\n${missing.length} package(s) missing 'test' script.`);
  process.exit(1);
}

console.log(`\n✓ All ${REQUIRED_PACKAGES.length} packages have 'test' scripts.`);
