# Manifest Generator

## Overview

The manifest generator creates production deployment manifests from discovered micro-frontends. It supports semantic versioning, SRI integrity hashes, and environment-specific CDN URLs.

## Usage

### Generate Manifest

```bash
# Dry-run (preview without writing)
pnpm run generate:manifest --dry-run

# Generate for production
pnpm run generate:manifest --env production --cdn-base-url https://cdn.example.com

# Generate for staging
pnpm run generate:manifest --env staging --cdn-base-url https://staging-cdn.example.com --output manifest.staging.json

# Custom git hash
pnpm run generate:manifest --git-hash abc1234
```

### CLI Options

| Option           | Short | Description                                             | Default                    |
| ---------------- | ----- | ------------------------------------------------------- | -------------------------- |
| `--output`       | `-o`  | Output path for manifest file                           | `manifest.production.json` |
| `--env`          | `-e`  | Environment: development\|staging\|production           | `production`               |
| `--cdn-base-url` | `-c`  | CDN base URL                                            | `https://cdn.example.com`  |
| `--git-hash`     | `-g`  | Git hash for versioning (auto-detected if not provided) | Auto-detected              |
| `--dry-run`      | `-d`  | Print manifest without writing file                     | false                      |
| `--help`         | `-h`  | Show help message                                       | -                          |

## Validation

The generator automatically validates the manifest against the JSON schema before writing:

```bash
# Validate an existing manifest
pnpm exec tsx scripts/validate-manifest.ts manifest.production.json
```

## Manifest Format

See [manifest.schema.json](../manifest.schema.json) for the complete schema.

### Example Manifest

```json
{
  "$schema": "./manifest.schema.json",
  "version": "1.0.0",
  "timestamp": "2026-07-17T10:00:00Z",
  "environment": "production",
  "microfrontends": {
    "mfe-widget": {
      "version": "1.2.3",
      "url": "https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js",
      "integrity": "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC",
      "scope": "widget",
      "module": "./App",
      "metadata": {
        "buildHash": "a1b2c3d",
        "buildDate": "2026-07-17T09:55:00Z"
      }
    }
  },
  "cdn": {
    "baseUrl": "https://cdn.example.com"
  }
}
```

## Features

### Automatic Discovery

The generator uses the same MFE discovery logic as `generate:config`:

- Scans `apps/mfe-*` directories
- Reads `package.json` for name and version
- Derives scope from package name

### SRI Hash Computation

For production and staging environments, the generator computes SHA-384 integrity hashes from the built `remoteEntry.js` files:

```typescript
// Hash is computed from: apps/mfe-widget/dist/remoteEntry.js
"integrity": "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
```

### Git Metadata

Build metadata is automatically extracted from git:

- **buildHash**: Git commit SHA (7 chars)
- **buildDate**: Git commit timestamp (ISO 8601)

If git is unavailable, sensible defaults are used.

### Environment-Specific URLs

URLs are generated based on the target environment:

**Development:**

```
http://localhost:5174/remoteEntry.js
```

**Production/Staging:**

```
https://cdn.example.com/mfe-widget/1.2.3/remoteEntry.js
```

## TypeScript Types

TypeScript types are available at `types/manifest.ts`:

```typescript
import type { MicroFrontendManifest, MicroFrontendEntry } from "../types/manifest";

const manifest: MicroFrontendManifest = {
  version: "1.0.0",
  timestamp: new Date().toISOString(),
  environment: "production",
  microfrontends: {
    /* ... */
  },
};
```

## Testing

Unit tests are located in `packages/monorepo-tools/src/`:

- `manifest-validation.test.ts` - Schema validation tests
- `manifest-generation.test.ts` - Generation logic tests

Run tests:

```bash
pnpm test --filter @mfe-runtine/monorepo-tools
```

## Integration with Shell

The shell application can fetch and consume the manifest:

```typescript
import { fetchManifest } from "./shell/manifest";
import { DynamicLoader } from "@mfe-runtine/dynamic-loader";

const manifest = await fetchManifest("https://cdn.example.com/manifest.json");
const loader = new DynamicLoader();
loader.setConfig(manifest);
```

## Deployment Workflow

### Manual Deployment (MVP)

1. Build all MFEs:

   ```bash
   pnpm run build
   ```

2. Generate production manifest:

   ```bash
   pnpm run generate:manifest --env production --cdn-base-url https://your-cdn.com
   ```

3. Upload MFE bundles to CDN:

   ```
   apps/mfe-widget/dist/ → https://your-cdn.com/mfe-widget/1.2.3/
   ```

4. Upload manifest to CDN:

   ```
   manifest.production.json → https://your-cdn.com/manifest.json
   ```

5. Deploy shell application with CDN manifest URL

### Future: Automated CI/CD

See `openspec/changes/production-deployment-architecture/` for planned automation including:

- GitHub Actions workflow
- Automated CDN uploads
- Rollback tooling
- Monitoring

## Related Files

- `manifest.schema.json` - JSON Schema definition
- `manifest.example.json` - Example manifest
- `scripts/generate-manifest.ts` - Generator implementation
- `scripts/validate-manifest.ts` - Validation utility
- `types/manifest.ts` - TypeScript types
- `README.md` - Main documentation (includes manifest section)
