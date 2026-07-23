# config-generation Specification

## Purpose

This specification defines the config generation system that transforms discovered micro-frontend metadata into a validated RemoteConfig object. The system generates environment-specific URLs (localhost for development, CDN with versioning for production) and validates the output against JSON Schema before writing to disk.

## Requirements

### Requirement: Generate config from discovered micro-frontends

The system SHALL generate a valid RemoteConfig object from an array of MicroFrontend objects.

#### Scenario: Generate development config

- **WHEN** generateConfig is called with one MicroFrontend in development mode
- **THEN** config contains one remote entry
- **AND** entryUrl is `http://localhost:{port}/remoteEntry.js`
- **AND** scope matches MicroFrontend scope
- **AND** version matches MicroFrontend version

#### Scenario: Generate production config with git hash

- **WHEN** generateConfig is called in production mode with gitHash "abc123"
- **THEN** entryUrl includes `/v{gitHash}/`
- **AND** version field uses git hash instead of package version

#### Scenario: Multiple micro-frontends generate multiple remotes

- **WHEN** generateConfig receives array of 3 MicroFrontends
- **THEN** config.remotes array has 3 entries
- **AND** each entry has unique name

---

### Requirement: Support environment-specific URL generation

The system SHALL generate different entry URLs based on environment.

#### Scenario: Development URLs use localhost

- **WHEN** environment is "development" and MicroFrontend has port 5174
- **THEN** entryUrl is `http://localhost:5174/remoteEntry.js`

#### Scenario: Production URLs use base URL and versioning

- **WHEN** environment is "production" with baseUrl "https://cdn.example.com" and gitHash "abc123"
- **THEN** entryUrl is `https://cdn.example.com/mfe-{name}/vabc123/remoteEntry.js`

#### Scenario: Production defaults to latest when no git hash

- **WHEN** environment is "production" without gitHash
- **THEN** entryUrl includes `/vlatest/`

---

### Requirement: Validate generated config against JSON Schema

The system SHALL validate the generated config object before returning it.

#### Scenario: Valid config passes validation

- **WHEN** generated config conforms to schema
- **THEN** validation succeeds
- **AND** config is returned

#### Scenario: Invalid config throws error

- **WHEN** generated config violates schema (e.g., invalid URL format)
- **THEN** validation throws error
- **AND** error message explains validation failure

---

### Requirement: Include JSON Schema reference in config

The system SHALL add $schema field to generated config for IDE support.

#### Scenario: Schema reference included

- **WHEN** config is generated
- **THEN** config.$schema points to remote-config schema.json
- **AND** path is relative for local workspace resolution

### Requirement: System SHALL generate config from discovered micro-frontends

The system SHALL create `remotes.config.json` containing all discovered micro-frontends with their metadata and URLs.

#### Scenario: Config generated for single micro-frontend

- **WHEN** monorepo contains `apps/mfes/mfe-widget/` only
- **THEN** generator SHALL create config with one remote entry
- **AND** config SHALL include name, entryUrl, scope, version from package.json

Example generated config:

```json
{
  "$schema": "../../packages/remote-config/schema.json",
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js",
      "scope": "mfeWidget",
      "version": "1.0.0"
    }
  ]
}
```

#### Scenario: Config generated for multiple micro-frontends

- **WHEN** monorepo contains `apps/mfes/mfe-widget/`, `apps/mfes/mfe-dashboard/`, `apps/mfes/mfe-chart/`
- **THEN** generator SHALL create config with three remote entries in alphabetical order
- **AND** each entry SHALL have unique name and port

#### Scenario: Config generated to specific output path

- **WHEN** running generator with output path `apps/shells/website/public/remotes.config.json`
- **THEN** generator SHALL write config to specified path
- **AND** parent directory SHALL be created if not exists

### Requirement: System SHALL generate environment-specific URLs

The system SHALL generate different entryUrl values based on target environment (development, staging, production).

#### Scenario: Development URLs use localhost

- **WHEN** NODE_ENV=development
- **THEN** generator SHALL create entryUrl as `http://localhost:{port}/assets/remoteEntry.js`
- **AND** port SHALL be assigned from discovery (alphabetical order or package.json override)

Example development config:

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js"
    }
  ]
}
```

#### Scenario: Production URLs use deployed paths

- **WHEN** NODE_ENV=production
- **THEN** generator SHALL create entryUrl as `/mfe-{name}/assets/remoteEntry.js` or with version hash
- **AND** URLs SHALL be relative paths (deployed to same domain as host)

Example production config:

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "/mfe-widget/assets/remoteEntry.js"
    }
  ]
}
```

#### Scenario: Production URLs with git hash versioning

- **WHEN** NODE_ENV=production and VITE_GIT_HASH environment variable set
- **THEN** generator SHALL create entryUrl as `/mfe-{name}/v{gitHash}/assets/remoteEntry.js`
- **AND** git hash SHALL be used for cache-busting

Example versioned production config:

```json
{
  "remotes": [
    {
      "name": "mfe-widget",
      "entryUrl": "/mfe-widget/v7a8f9c2/assets/remoteEntry.js"
    }
  ]
}
```

#### Scenario: Custom base URL from environment variable

- **WHEN** VITE_APP_URL environment variable is set to `https://app.example.com`
- **THEN** generator SHALL use custom base URL for entryUrl
- **AND** entryUrl SHALL be `https://app.example.com/mfe-{name}/assets/remoteEntry.js`

### Requirement: System SHALL extract scope name from package name

The system SHALL derive Module Federation scope from package.json name field.

#### Scenario: Scope derived from scoped package name

- **WHEN** package.json has `"name": "@mfe-runtine/mfe-widget"`
- **THEN** generator SHALL derive scope as "mfeWidget" (camelCase, strip @mfe-runtine/ prefix)

#### Scenario: Scope derived from unscoped package name

- **WHEN** package.json has `"name": "mfe-dashboard"`
- **THEN** generator SHALL derive scope as "mfeDashboard" (camelCase)

#### Scenario: Custom scope from package.json mfe field

- **WHEN** package.json has `{ "mfe": { "scope": "customScope" } }`
- **THEN** generator SHALL use "customScope" instead of derived scope

### Requirement: System SHALL validate generated config against schema

The system SHALL validate generated config against JSON Schema before writing to file.

#### Scenario: Valid generated config passes validation

- **WHEN** config is generated with valid structure
- **THEN** generator SHALL validate against schema from `packages/remote-config/schema.json`
- **AND** validation SHALL pass
- **AND** config SHALL be written to file

#### Scenario: Invalid generated config fails generation

- **WHEN** config generation produces invalid structure (e.g., missing required fields)
- **THEN** generator SHALL fail validation
- **AND** generator SHALL throw error with validation details
- **AND** file SHALL NOT be written

#### Scenario: Validation errors include field paths

- **WHEN** generated config has validation error
- **THEN** error message SHALL include field path (e.g., "remotes[0].entryUrl is invalid")
- **AND** error SHALL include reason (e.g., "must be valid URL")

### Requirement: System SHALL include schema reference in generated config

The system SHALL add `$schema` field to generated config for IDE autocomplete.

#### Scenario: Schema reference added to config

- **WHEN** generating config
- **THEN** config SHALL include `"$schema": "../../packages/remote-config/schema.json"`
- **AND** IDE SHALL use schema for autocomplete when editing config

### Requirement: System SHALL handle generation errors gracefully

The system SHALL provide helpful error messages when config generation fails.

#### Scenario: No micro-frontends found

- **WHEN** discovery returns empty array (no apps/mfes/mfe-\* directories)
- **THEN** generator SHALL emit warning "No micro-frontends found matching apps/mfes/mfe-\*"
- **AND** generator SHALL create empty config with `"remotes": []`
- **AND** generation SHALL NOT fail

#### Scenario: Port conflict detected

- **WHEN** two micro-frontends have same port configured
- **THEN** generator SHALL throw error "Port conflict: mfe-{a} and mfe-{b} both use port {port}"
- **AND** generation SHALL fail

#### Scenario: Invalid package.json in micro-frontend

- **WHEN** discovery skips micro-frontend due to invalid package.json
- **THEN** generator SHALL exclude that micro-frontend from config
- **AND** generator SHALL emit warning "Skipping apps/mfes/mfe-{name}/ due to invalid package.json"
- **AND** generator SHALL continue with other micro-frontends

### Requirement: System SHALL support config generation as Turborepo task

The system SHALL integrate with Turborepo pipeline for automatic config generation.

#### Scenario: Config generation runs before host build

- **WHEN** Turborepo pipeline has `generate:config` task with `"dependsOn": ["^build"]`
- **AND** running `turbo build --filter website`
- **THEN** Turborepo SHALL run all mfe builds first
- **AND** Turborepo SHALL run generate:config after all mfes ready
- **AND** Turborepo SHALL build website last

#### Scenario: Config generation cached by Turborepo

- **WHEN** running `turbo generate:config` with unchanged micro-frontends
- **THEN** Turborepo SHALL serve config from cache
- **AND** generation SHALL complete instantly

#### Scenario: Config regenerated when micro-frontend changes

- **WHEN** micro-frontend source code changes
- **THEN** Turborepo SHALL detect change and rebuild that mfe
- **AND** Turborepo SHALL invalidate generate:config cache
- **AND** Turborepo SHALL regenerate config with updated mfe

### Requirement: System SHALL provide CLI tool for config generation

The system SHALL expose standalone CLI tool for manual config generation outside Turborepo.

#### Scenario: CLI generates config

- **WHEN** running `pnpm generate:config` or `tsx scripts/generate-config.ts`
- **THEN** CLI SHALL discover micro-frontends
- **AND** CLI SHALL generate config to default output path
- **AND** CLI SHALL exit with code 0 on success

#### Scenario: CLI with custom output path

- **WHEN** running `tsx scripts/generate-config.ts --output custom/path/config.json`
- **THEN** CLI SHALL write config to specified path

#### Scenario: CLI with environment override

- **WHEN** running `NODE_ENV=production tsx scripts/generate-config.ts`
- **THEN** CLI SHALL generate production URLs

#### Scenario: CLI shows dry run

- **WHEN** running `tsx scripts/generate-config.ts --dry-run`
- **THEN** CLI SHALL print generated config to stdout
- **AND** CLI SHALL NOT write to file

### Requirement: System SHALL support incremental config updates

The system SHALL detect which micro-frontends changed and only update those entries.

#### Scenario: Unchanged micro-frontends preserve order

- **WHEN** regenerating config with same micro-frontends
- **THEN** generator SHALL maintain same order as previous config
- **AND** unchanged entries SHALL have identical content

#### Scenario: New micro-frontend appended to config

- **WHEN** new micro-frontend added to monorepo
- **THEN** generator SHALL add new entry to config in alphabetical position
- **AND** existing entries SHALL remain unchanged

#### Scenario: Removed micro-frontend excluded from config

- **WHEN** micro-frontend directory deleted
- **THEN** generator SHALL exclude that entry from config
- **AND** other entries SHALL remain unchanged

### Requirement: System SHALL include metadata for debugging

The system SHALL add generated timestamp and generator version to config for debugging.

#### Scenario: Metadata added to generated config

- **WHEN** generating config
- **THEN** config MAY include `_meta` field with generatedAt timestamp and generator version
- **AND** metadata SHALL NOT affect runtime behavior (loader ignores it)

Example config with metadata:

```json
{
  "$schema": "../../packages/remote-config/schema.json",
  "_meta": {
    "generatedAt": "2026-07-08T14:30:00Z",
    "generatorVersion": "1.0.0",
    "environment": "development"
  },
  "remotes": [...]
}
```

### Requirement: System SHALL support TypeScript API for generation

The system SHALL expose programmatic API for config generation in TypeScript.

#### Scenario: Generate config programmatically

- **WHEN** calling `await generateConfig({ environment: 'production', outputPath: 'path/to/config.json' })`
- **THEN** function SHALL discover micro-frontends
- **AND** function SHALL generate config for specified environment
- **AND** function SHALL write to specified output path
- **AND** function SHALL return generated config object

Example TypeScript usage:

```typescript
import { generateConfig } from "@mfe-runtine/monorepo-tools";

const config = await generateConfig({
  environment: "production",
  outputPath: "apps/shells/website/public/remotes.config.json",
  gitHash: process.env.VITE_GIT_HASH,
});

console.log(`Generated config with ${config.remotes.length} remotes`);
```

### Requirement: System SHALL gitignore generated config

The system SHALL ensure generated config is not committed to git (regenerated on every build).

#### Scenario: Generated config path in gitignore

- **WHEN** config is generated to `apps/shells/website/public/remotes.config.json`
- **THEN** that path SHALL be listed in `.gitignore`
- **AND** git status SHALL not show config as untracked

#### Scenario: Config regenerated on clean checkout

- **WHEN** cloning repository (config not in git)
- **AND** running `pnpm install && turbo build`
- **THEN** config SHALL be regenerated from filesystem discovery
- **AND** build SHALL complete successfully
