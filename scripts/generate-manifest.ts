#!/usr/bin/env node

/**
 * Generate production deployment manifest from discovered micro-frontends
 *
 * Usage:
 *   tsx scripts/generate-manifest.ts
 *   tsx scripts/generate-manifest.ts --env production --cdn-base-url https://cdn.example.com
 *   tsx scripts/generate-manifest.ts --output manifest.production.json
 *   tsx scripts/generate-manifest.ts --dry-run
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { discoverMicroFrontends } from "../packages/monorepo-tools/dist/index.mjs";
import { validateManifest } from "./validate-manifest.js";
import type { MicroFrontendManifest, MicroFrontendEntry } from "../types/manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

interface CLIOptions {
  output: string;
  env: "development" | "staging" | "production";
  cdnBaseUrl: string;
  gitHash?: string;
  dryRun: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    output: "manifest.production.json",
    env: "production",
    cdnBaseUrl: "https://cdn.example.com",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--env" || arg === "-e") {
      const env = args[++i];
      if (env !== "development" && env !== "staging" && env !== "production") {
        console.error(
          `Invalid environment: ${env}. Must be "development", "staging", or "production".`,
        );
        process.exit(1);
      }
      options.env = env;
    } else if (arg === "--cdn-base-url" || arg === "-c") {
      options.cdnBaseUrl = args[++i];
    } else if (arg === "--git-hash" || arg === "-g") {
      options.gitHash = args[++i];
    } else if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/generate-manifest.ts [options]

Options:
  -o, --output <path>         Output path for manifest file (default: manifest.production.json)
  -e, --env <env>             Environment: development|staging|production (default: production)
  -c, --cdn-base-url <url>    CDN base URL (default: https://cdn.example.com)
  -g, --git-hash <hash>       Git hash for versioning (auto-detected if not provided)
  -d, --dry-run               Print manifest without writing file
  -h, --help                  Show this help message
`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error("Use --help for usage information");
      process.exit(1);
    }
  }

  return options;
}

/**
 * Get current git commit SHA
 */
function getGitHash(): string {
  try {
    return execSync("git rev-parse --short=7 HEAD", { encoding: "utf-8" }).trim();
  } catch (error) {
    console.warn("⚠️  Could not retrieve git hash, using 'unknown'");
    return "unknown";
  }
}

/**
 * Get current git commit timestamp
 */
function getGitTimestamp(): string {
  try {
    return execSync("git log -1 --format=%cI", { encoding: "utf-8" }).trim();
  } catch (error) {
    return new Date().toISOString();
  }
}

/**
 * Compute SRI hash for a file
 */
async function computeSRIHash(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath);
    const hash = createHash("sha384").update(content).digest("base64");
    return `sha384-${hash}`;
  } catch (error) {
    console.warn(
      `⚠️  Could not compute SRI hash for ${filePath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return "";
  }
}

/**
 * Generate environment-specific URL for a micro-frontend
 */
function generateMFEUrl(options: {
  cdnBaseUrl: string;
  mfeName: string;
  version: string;
  env: string;
}): string {
  const { cdnBaseUrl, mfeName, version, env } = options;

  if (env === "development") {
    // For development, use localhost (this shouldn't typically be used)
    return `http://localhost:5174/remoteEntry.js`;
  }

  // Production/staging: use CDN with versioned path
  return `${cdnBaseUrl}/${mfeName}/${version}/remoteEntry.js`;
}

/**
 * Generate manifest from discovered MFEs
 */
async function generateManifest(options: CLIOptions): Promise<MicroFrontendManifest> {
  const gitHash = options.gitHash || getGitHash();
  const timestamp = getGitTimestamp();

  console.log("🔍 Discovering micro-frontends...");
  const microFrontends = await discoverMicroFrontends(rootDir);

  if (microFrontends.length === 0) {
    console.warn("⚠️  No micro-frontends found in apps/mfe-*/");
  }

  const manifest: MicroFrontendManifest = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: options.env,
    microfrontends: {},
    cdn: {
      baseUrl: options.cdnBaseUrl,
    },
  };

  console.log(`✅ Found ${microFrontends.length} micro-frontend(s):`);

  for (const mfe of microFrontends) {
    console.log(`   - ${mfe.shortName} (${mfe.name}) v${mfe.version}`);

    const url = generateMFEUrl({
      cdnBaseUrl: options.cdnBaseUrl,
      mfeName: mfe.shortName,
      version: mfe.version,
      env: options.env,
    });

    // Compute SRI hash for production builds
    let integrity: string | undefined;
    if (options.env === "production" || options.env === "staging") {
      const distPath = join(rootDir, "apps", mfe.shortName, "dist", "remoteEntry.js");
      integrity = await computeSRIHash(distPath);
    }

    const entry: MicroFrontendEntry = {
      version: mfe.version,
      url,
      scope: mfe.scope,
      module: "./App", // TODO: Make this discoverable from vite.config.ts
      ...(integrity && { integrity }),
      metadata: {
        buildHash: gitHash,
        buildDate: timestamp,
      },
    };

    manifest.microfrontends[mfe.shortName] = entry;
  }

  return manifest;
}

async function main() {
  try {
    const options = parseArgs();

    console.log(`\n⚙️  Generating manifest for ${options.env} environment...`);
    const manifest = await generateManifest(options);

    // Validate manifest against schema
    console.log("\n🔍 Validating manifest against schema...");
    const validation = validateManifest(manifest);
    if (!validation.valid) {
      console.error("❌ Manifest validation failed:");
      validation.errors.forEach((err) => console.error(`   - ${err}`));
      process.exit(1);
    }
    console.log("✅ Manifest is valid");

    if (options.dryRun) {
      console.log("\n📄 Generated manifest (dry-run):");
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    // Create parent directories if they don't exist
    const outputPath = join(rootDir, options.output);
    const outputDir = dirname(outputPath);
    await mkdir(outputDir, { recursive: true });

    // Write manifest file
    await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");

    console.log(`\n✅ Manifest written to ${options.output}`);
    const mfeCount = Object.keys(manifest.microfrontends).length;
    console.log(`   ${mfeCount} micro-frontend(s) configured`);
  } catch (error) {
    console.error("\n❌ Error generating manifest:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
