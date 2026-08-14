# Remote Config Generator

<!-- Implements CG-1, CG-2, CG-3: local mode, root MFE, local override -->
<!-- See openspec/changes/remote-config-environment-cleanup/specs/config-generation/spec.md -->

## Overview

The config generator creates remote manifests (`remotes.config.json`) from discovered micro-frontends. It supports:

- **Local mode** (`--environment local`): localhost URLs for local development
- **Production mode** (`--environment production`): versioned CDN URLs
- **Root MFE designation** (`--root-mfe`): map a specific MFE to the "/" route
- **Local override manifests**: gitignored `remotes.config.local.json` for per-developer customization
- **Release channels**: channel-specific URLs with automatic dev fallback

## Usage

### Generate Local Override (CG-3)

```bash
# Generate local override for website shell (gitignored, localhost URLs)
pnpm exec tsx scripts/generate-config.ts --environment local --shell website

# Dry-run local config with landing-page as root MFE
pnpm exec tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page --dry-run

# Generate local config for ccis shell
pnpm exec tsx scripts/generate-config.ts --environment local --shell ccis
```

**Output:** `apps/shells/website/remotes.config.local.json` (gitignored, served by dev server)

### Generate Production Config

```bash
# Generate production config for website shell
pnpm exec tsx scripts/generate-config.ts --environment production --shell website --git-hash abc123

# With custom base URL and channel
pnpm exec tsx scripts/generate-config.ts --environment production --base-url https://cdn.example.com --channel release-4.10
```

**Output:** `apps/shells/website/public/remotes.config.json`

### CLI Options

| Option          | Short | Description                                                                                   | Default                                          |
| --------------- | ----- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `--shell`       | `-s`  | Shell name (e.g., website, ccis). Auto-derives output path.                                   | -                                                |
| `--output`      | `-o`  | Output path for config file                                                                   | `apps/shells/website/public/remotes.config.json` |
| `--environment` | `-e`  | Environment: **local** \| production <br/>Note: `development` is deprecated; use `local`      | `local`                                          |
| `--root-mfe`    | `-r`  | Root MFE designation (e.g., mfe-landing-page) — maps to "/" route instead of default basePath | -                                                |
| `--git-hash`    | `-g`  | Git hash for versioning (production only)                                                     | `latest`                                         |
| `--base-url`    | `-b`  | CDN base URL for production deployments                                                       | -                                                |
| `--channel`     | `-c`  | Release channel (e.g., release-4.10) for channel-aware URLs with dev fallback                 | -                                                |
| `--dry-run`     | `-d`  | Print config without writing file                                                             | `false`                                          |
| `--help`        | `-h`  | Show help message                                                                             | -                                                |

**Environment modes (CG-1):**

- **`local`** (recommended): Generates localhost URLs (`http://localhost:{port}/remoteEntry.js`). Use for local development.
- **`production`**: Generates versioned CDN URLs (`https://cdn.example.com/mfe-{name}/v{hash}/remoteEntry.js`). Requires `--git-hash` or defaults to `vlatest`.
- **`development`** (deprecated): Throws an error with guidance to use `local` instead.

**Output path derivation:**

- If `--shell` is provided:
  - `local` environment → `apps/shells/{shell}/remotes.config.local.json` (gitignored, served by dev server)
  - Other environments → `apps/shells/{shell}/public/remotes.config.json`
- If `--output` is provided, it overrides the shell-derived path.

## Validation

The generator automatically validates the config against the JSON schema before writing:

```bash
# The schema is validated automatically during generation
pnpm exec tsx scripts/generate-config.ts --environment local --dry-run
```

If validation fails, the generator throws an error with details.

## Config Format

See `packages/remote-config/schema.json` for the complete JSON Schema.

### Example Local Config

```json
{
  "$schema": "../node_modules/@mfe-runtime/remote-config/schema.json",
  "schemaVersion": "2.0.0",
  "chrome": {},
  "features": {
    "/": {
      "mfe": "mfe-landing-page",
      "entryUrl": "http://localhost:5174/remoteEntry.js",
      "scope": "landingPage",
      "version": "0.0.1",
      "basePath": "/",
      "requiresAuth": false,
      "requiredRoles": [],
      "enabled": true
    },
    "/widget": {
      "mfe": "mfe-widget",
      "entryUrl": "http://localhost:5175/remoteEntry.js",
      "scope": "widget",
      "version": "0.0.1",
      "basePath": "/widget",
      "requiresAuth": false,
      "requiredRoles": [],
      "enabled": true
    }
  }
}
```

### Example Production Config

```json
{
  "$schema": "../node_modules/@mfe-runtime/remote-config/schema.json",
  "schemaVersion": "2.0.0",
  "chrome": {},
  "features": {
    "/landing-page": {
      "mfe": "mfe-landing-page",
      "entryUrl": "https://cdn.example.com/mfe-mfe-landing-page/vabc123/remoteEntry.js",
      "scope": "landingPage",
      "version": "abc123",
      "basePath": "/landing-page",
      "requiresAuth": false,
      "requiredRoles": [],
      "enabled": true
    }
  }
}
```

## Features

### Automatic Discovery

The generator scans `apps/mfes/mfe-*` directories and reads `package.json` for:

- Package name and version
- Scope (derived from package name or explicitly set)
- Port assignment (from local port map)

### Environment-Specific URLs (CG-1)

URLs are generated based on the target environment:

**Local** (localhost development):

```
http://localhost:5174/remoteEntry.js
```

**Production** (versioned CDN):

```
https://cdn.example.com/mfe-widget/vabc123/remoteEntry.js
```

**Production without git hash** (latest pointer):

```
https://cdn.example.com/mfe-widget/vlatest/remoteEntry.js
```

### Root MFE Designation (CG-2)

When `--root-mfe mfe-landing-page` is provided:

- The designated MFE's route key becomes `"/"` instead of its default `"/landing-page"`
- All other MFEs keep their default base paths
- Unknown MFE names throw an error listing available MFEs

**Example:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page --dry-run
```

**Output:**

```json
{
  "features": {
    "/": {
      "mfe": "mfe-landing-page",
      ...
    },
    "/widget": {
      "mfe": "mfe-widget",
      ...
    }
  }
}
```

### Local Override Workflow (CG-3)

1. **Generate the local override:**

   ```bash
   pnpm exec tsx scripts/generate-config.ts --environment local --shell website
   ```

   Writes to: `apps/shells/website/remotes.config.local.json` (gitignored)

2. **Dev server serves it automatically:**

   When the dev server (`pnpm run dev`) starts, the `serve-local-remote-config` middleware serves:
   - `remotes.config.local.json` if present (local override active)
   - Falls back to `config/remotes.config.dev.json` if absent

3. **Shell runtime fetches from `/remotes.config.json`:**

   No code changes needed — the shell always fetches `/remotes.config.json`, and the dev server decides which file to serve.

4. **Customize per-developer:**

   Each developer can generate their own local override with different root MFE, port overrides, or feature toggles. The file is gitignored, so changes stay local.

### Release Channels

When `--channel release-4.10` is provided:

- The generator checks if each MFE has a build at `<baseUrl>/<mfe>/release-4.10/remoteEntry.js`
- If yes, uses the channel URL
- If no, falls back to `<baseUrl>/<mfe>/dev/remoteEntry.js`
- Warnings are logged for missing channel builds

## TypeScript Types

TypeScript types are available in `packages/monorepo-tools/src/types.ts`:

```typescript
import type { ConfigGenerationOptions, RemoteConfig } from "@mfe-runtime/monorepo-tools";
import { generateConfig, discoverMicroFrontends } from "@mfe-runtime/monorepo-tools";

const mfes = await discoverMicroFrontends("/path/to/repo");
const config: RemoteConfig = await generateConfig(mfes, {
  environment: "local",
  rootMfe: "mfe-landing-page",
});
```

## Testing

Unit tests are located in `packages/monorepo-tools/src/`:

- `config-generator.test.ts` — Environment modes (CG-1) and root MFE designation (CG-2)
- `manifest-validation.test.ts` — Schema validation
- `discovery.test.ts` — MFE discovery logic

Run tests:

```bash
pnpm test --filter @mfe-runtime/monorepo-tools
```

## Integration with Shell

The shell fetches the remote config at runtime:

```typescript
import { loadRemoteConfig } from "./shell/runtime-config";

// Shell always fetches from /remotes.config.json
// Dev server decides which file to serve (local override or dev config)
const config = await loadRemoteConfig();
```

**Dev server behavior:**

- If `remotes.config.local.json` exists at shell root → serve it (local override active)
- Else → serve `config/remotes.config.dev.json` (committed dev config)

**Production behavior:**

- Build process copies the selected config to `dist/remotes.config.json` based on `DEPLOY_ENV`
- No local override in production builds

## Local Development Workflow

### First-Time Setup

1. **Generate your local override:**

   ```bash
   pnpm exec tsx scripts/generate-config.ts --environment local --shell website
   ```

2. **Start the dev server:**

   ```bash
   pnpm run dev
   ```

3. **Verify local override is active:**

   Console log: `ℹ️ Local override active: remotes.config.local.json`

### Customize Your Local Setup

**Set a root MFE:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --shell website --root-mfe mfe-landing-page
```

**Preview before writing:**

```bash
pnpm exec tsx scripts/generate-config.ts --environment local --root-mfe mfe-landing-page --dry-run
```

**Remove local override to revert to committed dev config:**

```bash
rm apps/shells/website/remotes.config.local.json
```

Dev server will automatically fall back to `config/remotes.config.dev.json`.

## Production Deployment Workflow

See `openspec/changes/azure-blob-deployment-pipeline/` for the full deployment workflow. High-level steps:

1. **Build all MFEs:**

   ```bash
   pnpm run build
   ```

2. **Generate production config:**

   ```bash
   pnpm exec tsx scripts/generate-config.ts \
     --environment production \
     --shell website \
     --git-hash $(git rev-parse --short HEAD) \
     --base-url https://cdn.example.com
   ```

3. **Shell build copies the selected config:**

   ```bash
   DEPLOY_ENV=prod pnpm run build --filter @mfe-runtime/shell-website
   ```

   Output: `dist/remotes.config.json` (production URLs)

4. **Upload to CDN and deploy shell**

## Related Files

- `packages/monorepo-tools/src/config-generator.ts` — Generator implementation
- `packages/monorepo-tools/src/types.ts` — TypeScript types
- `packages/remote-config/schema.json` — JSON Schema
- `scripts/generate-config.ts` — CLI entry point
- `GETTING_STARTED.md` — Local testing section (references this workflow)
