#!/usr/bin/env node

/**
 * Generate remotes.config.json from discovered micro-frontends
 *
 * Usage:
 *   tsx scripts/generate-config.ts --shell website
 *   tsx scripts/generate-config.ts --shell ccis --environment production --git-hash abc123
 *   tsx scripts/generate-config.ts --environment local --dry-run
 *   tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page
 *   tsx scripts/generate-config.ts --output apps/shells/website/public/remotes.config.json
 *
 * Implements:
 * - multi-shell-tooling: config-generation requirement
 * - CG-3: generator produces local override manifest
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
  environment: "local" | "production" | "development";
  gitHash?: string;
  baseUrl?: string;
  channel?: string;
  rootMfe?: string;
  dryRun: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    output: "apps/shells/website/public/remotes.config.json",
    environment: "local",
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
      if (env !== "local" && env !== "production" && env !== "development") {
        console.error(
          `Invalid environment: ${env}. Must be "local", "production", or "development" (deprecated).`,
        );
        process.exit(1);
      }
      options.environment = env;
    } else if (arg === "--git-hash" || arg === "-g") {
      options.gitHash = args[++i];
    } else if (arg === "--base-url" || arg === "-b") {
      options.baseUrl = args[++i];
    } else if (arg === "--channel" || arg === "-c") {
      options.channel = args[++i];
    } else if (arg === "--root-mfe" || arg === "-r") {
      options.rootMfe = args[++i];
    } else if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/generate-config.ts [options]

Options:
  -s, --shell <name>          Shell name (e.g., website, ccis). Derives output path automatically.
  -o, --output <path>         Output path for config file (default: apps/shells/website/public/remotes.config.json)
  -e, --environment <env>     Environment: local|production (default: local)
                              Note: "development" is deprecated; use "local" for localhost URLs
  -g, --git-hash <hash>       Git hash for production versioning
  -b, --base-url <url>        Base URL for production deployments
  -c, --channel <channel>     Release channel (e.g., release-4.10) for channel-aware URLs with dev fallback
  -r, --root-mfe <mfe>        Root MFE designation (e.g., mfe-landing-page) — maps to "/" route
  -d, --dry-run               Print config without writing file
  -h, --help                  Show this help message

Examples:
  # Generate local override for website shell (localhost URLs, gitignored file)
  tsx scripts/generate-config.ts --environment local --shell website

  # Dry-run local config with landing-page as root MFE
  tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page --dry-run

  # Generate production config
  tsx scripts/generate-config.ts --environment production --git-hash abc123 --base-url https://cdn.example.com

Note: If --shell is provided, --output is auto-derived.
For --environment local with --shell, output is apps/shells/<shell>/remotes.config.local.json (gitignored).
For other environments, output is apps/shells/<shell>/public/remotes.config.json.
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

    // Implements CG-3: local override manifest generation
    // If --shell is provided, auto-derive output path based on environment
    if (options.shell) {
      if (options.environment === "local") {
        // Local override goes to shell root (gitignored)
        options.output = `apps/shells/${options.shell}/remotes.config.local.json`;
      } else {
        // Other environments go to public/
        options.output = `apps/shells/${options.shell}/public/remotes.config.json`;
      }
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
    if (options.rootMfe) {
      console.log(`   Root MFE: ${options.rootMfe} → route "/"`);
    }

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

    if (options.environment === "local") {
      console.log(
        `\n💡 Local override active. Dev server will serve this file at /remotes.config.json`,
      );
      console.log(`   (Falls back to config/remotes.config.dev.json when absent)`);
    }
  } catch (error) {
    console.error("\n❌ Error generating config:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

void main();
