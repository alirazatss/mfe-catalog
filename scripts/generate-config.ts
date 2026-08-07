#!/usr/bin/env node

/**
 * Generate remotes.config.json from discovered micro-frontends
 *
 * Usage:
 *   tsx scripts/generate-config.ts --shell website
 *   tsx scripts/generate-config.ts --shell ccis --environment production --git-hash abc123
 *   tsx scripts/generate-config.ts --output apps/shells/website/public/remotes.config.json
 *   tsx scripts/generate-config.ts --dry-run
 *
 * Implements multi-shell-tooling: config-generation requirement
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverMicroFrontends, generateConfig } from "../packages/monorepo-tools/src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

interface CLIOptions {
  output: string;
  shell?: string;
  environment: "development" | "production";
  gitHash?: string;
  baseUrl?: string;
  dryRun: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    output: "apps/shells/website/public/remotes.config.json",
    environment: "development",
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--shell" || arg === "-s") {
      options.shell = args[++i];
    } else if (arg === "--output" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--environment" || arg === "-e") {
      const env = args[++i];
      if (env !== "development" && env !== "production") {
        console.error(`Invalid environment: ${env}. Must be "development" or "production".`);
        process.exit(1);
      }
      options.environment = env;
    } else if (arg === "--git-hash" || arg === "-g") {
      options.gitHash = args[++i];
    } else if (arg === "--base-url" || arg === "-b") {
      options.baseUrl = args[++i];
    } else if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/generate-config.ts [options]

Options:
  -s, --shell <name>          Shell name (e.g., website, ccis). Derives output path automatically.
  -o, --output <path>         Output path for config file (default: apps/shells/website/public/remotes.config.json)
  -e, --environment <env>     Environment: development|production (default: development)
  -g, --git-hash <hash>       Git hash for production versioning
  -b, --base-url <url>        Base URL for production deployments
  -d, --dry-run               Print config without writing file
  -h, --help                  Show this help message

Note: If --shell is provided, --output is auto-derived as apps/shells/<shell>/public/remotes.config.json
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

async function main() {
  try {
    const options = parseArgs();

    // Implements multi-shell-tooling: per-shell config scenario
    // If --shell is provided, auto-derive output path
    if (options.shell) {
      options.output = `apps/shells/${options.shell}/public/remotes.config.json`;
    }

    console.log("🔍 Discovering micro-frontends...");
    const microFrontends = await discoverMicroFrontends(rootDir);

    if (microFrontends.length === 0) {
      console.warn("⚠️  No micro-frontends found in apps/mfes/mfe-*/");
      return;
    }

    console.log(`✅ Found ${microFrontends.length} micro-frontend(s):`);
    for (const mfe of microFrontends) {
      console.log(`   - ${mfe.shortName} (${mfe.name}) on port ${mfe.port}`);
    }

    console.log(`\n⚙️  Generating config for ${options.environment} environment...`);
    const config = await generateConfig(microFrontends, options);

    if (options.dryRun) {
      console.log("\n📄 Generated config (dry-run):");
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    // Create parent directories if they don't exist
    const outputPath = join(rootDir, options.output);
    const outputDir = dirname(outputPath);
    await mkdir(outputDir, { recursive: true });

    // Write config file
    await writeFile(outputPath, JSON.stringify(config, null, 2) + "\n", "utf-8");

    console.log(`\n✅ Config written to ${options.output}`);
    const chromeCount = Object.keys(config.chrome ?? {}).length;
    const featureCount = Object.keys(config.features ?? {}).length;
    console.log(`   ${chromeCount} chrome MFE(s), ${featureCount} feature MFE(s) configured`);
  } catch (error) {
    console.error("\n❌ Error generating config:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
