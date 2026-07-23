## Why

With package structures in place, we need to implement the core auto-discovery and config generation logic that scans the monorepo for `apps/mfes/mfe-*` directories and generates the runtime configuration file.

## What Changes

- Implement discovery logic that scans for `apps/mfes/mfe-*` directories
- Implement config generation that creates `remotes.config.json` from discovered mfes
- Create CLI script for manual config generation
- Integrate config generation into Turborepo pipeline
- Ensure generated config is gitignored

## Capabilities

### New Capabilities

- `monorepo-discovery`: Scan apps/ directory for mfe-\* patterns and extract metadata
- `config-generation`: Generate remotes.config.json from discovered micro-frontends
- `turborepo-config-task`: Turborepo task for automatic config generation

## Impact

### Affected Code

- `packages/monorepo-tools/src/discovery.ts` - Implement discovery logic
- `packages/monorepo-tools/src/config-generator.ts` - Implement generation logic
- `turbo.json` - Add generate:config task
- `apps/shells/website/package.json` - Add prebuild script

### New Components

- `scripts/generate-config.ts` - CLI tool for manual generation
- `apps/shells/website/public/remotes.config.json` - Auto-generated (gitignored)

### Deployment Changes

- Config automatically regenerates on every build
