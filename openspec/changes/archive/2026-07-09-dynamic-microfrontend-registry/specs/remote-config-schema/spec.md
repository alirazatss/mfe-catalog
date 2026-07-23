# remote-config-schema Specification

## Purpose

Defines the JSON configuration format for declaring micro-frontend remotes. The config is **auto-generated at build time** from discovered `apps/mfes/mfe-*` directories in the monorepo, ensuring consistency between filesystem structure and runtime configuration. The schema enables IDE autocomplete and validation tooling.

## ADDED Requirements

**Note**: This config file is **auto-generated at build time** by the config generation system (see `config-generation/spec.md`). Developers do not manually edit this file. The schema defined below is used for:

1. **Validation**: Config generator validates output against this schema
2. **Runtime validation**: Dynamic loader validates fetched config
3. **IDE support**: Schema provides autocomplete when inspecting generated config

### Requirement: Config SHALL use valid JSON format

The system SHALL define remote configurations in standard JSON format for broad tooling compatibility.

#### Scenario: Valid JSON config parsed successfully

- **WHEN** the loader fetches `remotes.config.json` containing valid JSON
- **THEN** the system SHALL parse the config without errors
- **AND** the config SHALL be available to the loader

#### Scenario: Invalid JSON rejected

- **WHEN** config file contains invalid JSON (trailing commas, unquoted keys, syntax errors)
- **THEN** the system SHALL fail parsing with descriptive error
- **AND** the system SHALL fall back to static configuration from `vite.config.ts`
- **AND** the error SHALL be logged to console with file location

### Requirement: Config SHALL define remote entry metadata

The system SHALL support required and optional fields for each remote configuration.

#### Scenario: Minimal valid remote config

- **WHEN** config contains remote with `name`, `entryUrl`, and `scope` fields
- **THEN** the system SHALL accept the configuration
- **AND** the remote SHALL be loadable via dynamic loader

Example minimal config:

```json
{
  "remotes": [
    {
      "name": "remoteWidget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js",
      "scope": "default"
    }
  ]
}
```

#### Scenario: Full remote config with optional fields

- **WHEN** config contains remote with all optional fields (fallbackUrls, metadata, enabled, priority)
- **THEN** the system SHALL accept and use all fields
- **AND** optional behavior SHALL be applied (fallbacks, priority ordering, enable/disable)

Example full config:

```json
{
  "remotes": [
    {
      "name": "remoteWidget",
      "entryUrl": "https://cdn.example.com/remote-widget/assets/remoteEntry.js",
      "scope": "default",
      "fallbackUrls": ["https://cdn-backup.example.com/remote-widget/assets/remoteEntry.js"],
      "enabled": true,
      "priority": 10,
      "metadata": {
        "version": "1.2.3",
        "description": "Counter widget component"
      }
    }
  ]
}
```

### Requirement: Config SHALL support required fields validation

The system SHALL require specific fields for each remote and reject configs missing them.

#### Scenario: Missing required 'name' field

- **WHEN** config contains remote without `name` field
- **THEN** the system SHALL reject the config
- **AND** error message SHALL indicate "Remote at index {i} missing required field 'name'"

#### Scenario: Missing required 'entryUrl' field

- **WHEN** config contains remote without `entryUrl` field
- **THEN** the system SHALL reject the config
- **AND** error message SHALL indicate "Remote '{name}' missing required field 'entryUrl'"

#### Scenario: Missing required 'scope' field

- **WHEN** config contains remote without `scope` field
- **THEN** the system SHALL use default scope "default"
- **AND** the system SHALL emit warning to console

### Requirement: Config SHALL validate field types

The system SHALL enforce correct data types for all config fields.

#### Scenario: Name field must be string

- **WHEN** config contains remote with `name` as number or boolean
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote 'name' must be string"

#### Scenario: EntryUrl field must be string URL

- **WHEN** config contains remote with `entryUrl` that is not a valid URL string
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' entryUrl must be valid URL"

#### Scenario: FallbackUrls field must be array of strings

- **WHEN** config contains `fallbackUrls` as non-array or array with non-string elements
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' fallbackUrls must be array of URL strings"

#### Scenario: Enabled field must be boolean

- **WHEN** config contains `enabled` field with non-boolean value
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' enabled must be boolean"

#### Scenario: Priority field must be number

- **WHEN** config contains `priority` field with non-number value
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' priority must be number"

### Requirement: Config SHALL support environment-specific files

The system SHALL allow different configurations per environment via naming convention.

#### Scenario: Development environment loads dev config

- **WHEN** application runs in development mode (NODE_ENV=development)
- **THEN** the system SHALL attempt to load `remotes.config.dev.json` first
- **AND** if dev config not found, the system SHALL fall back to `remotes.config.json`

#### Scenario: Staging environment loads staging config

- **WHEN** application runs in staging mode (VITE_ENV=staging)
- **THEN** the system SHALL attempt to load `remotes.config.staging.json` first
- **AND** if staging config not found, the system SHALL fall back to `remotes.config.json`

#### Scenario: Production environment loads default config

- **WHEN** application runs in production mode (NODE_ENV=production)
- **THEN** the system SHALL load `remotes.config.json`
- **AND** no fallback SHALL be attempted

### Requirement: Config SHALL support multiple remotes

The system SHALL allow registering unlimited remotes in a single config file.

#### Scenario: Multiple remotes in config

- **WHEN** config contains array with 5 different remotes
- **THEN** the system SHALL load all 5 remotes
- **AND** each remote SHALL be independently loadable

#### Scenario: Empty remotes array

- **WHEN** config contains empty `remotes` array
- **THEN** the system SHALL accept the config
- **AND** no remotes SHALL be loaded
- **AND** the system SHALL emit warning to console

### Requirement: Config SHALL prevent duplicate remote names

The system SHALL reject configurations with duplicate remote names.

#### Scenario: Duplicate remote names detected

- **WHEN** config contains two remotes with same `name` value
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Duplicate remote name '{name}' at indices {i}, {j}"

### Requirement: Config SHALL support metadata extensibility

The system SHALL allow arbitrary metadata fields for application-specific needs without breaking validation.

#### Scenario: Custom metadata fields preserved

- **WHEN** remote config includes metadata fields like `team`, `owner`, `repository`
- **THEN** the system SHALL preserve metadata in loaded config
- **AND** metadata SHALL be accessible to application code
- **AND** unknown metadata fields SHALL NOT cause validation errors

Example:

```json
{
  "name": "remoteWidget",
  "entryUrl": "https://cdn.example.com/widget/entry.js",
  "scope": "default",
  "metadata": {
    "version": "1.2.3",
    "team": "platform-team",
    "repository": "github.com/org/remote-widget",
    "customField": "any-value"
  }
}
```

### Requirement: Config SHALL include JSON Schema for validation

The system SHALL provide JSON Schema file for IDE autocomplete and validation tooling.

#### Scenario: JSON Schema file available

- **WHEN** developer opens `remotes.config.json` in IDE
- **THEN** IDE SHALL load schema from `packages/remote-config/schema.json`
- **AND** IDE SHALL provide autocomplete for config fields
- **AND** IDE SHALL show inline validation errors

#### Scenario: Schema referenced in config file

- **WHEN** config file includes `$schema` field pointing to schema URL
- **THEN** validation tools SHALL use the referenced schema
- **AND** CI/CD pipelines MAY validate config against schema before deployment

Example:

```json
{
  "$schema": "./node_modules/@yourorg/remote-config/schema.json",
  "remotes": [...]
}
```

### Requirement: Config SHALL support cache-busting strategy

The system SHALL allow cache-busting via query parameters or versioned filenames.

#### Scenario: Config loaded with cache-busting query param

- **WHEN** config is requested as `remotes.config.json?v=20260708T120000Z`
- **THEN** the system SHALL fetch fresh config bypassing CDN cache
- **AND** timestamp SHALL be generated at build time or deployment

#### Scenario: Versioned config filename

- **WHEN** deployment uses filename pattern `remotes.config.{buildId}.json`
- **THEN** the system SHALL load config from versioned filename
- **AND** old config versions SHALL remain accessible for rollback

### Requirement: Config SHALL define TypeScript types

The system SHALL export TypeScript interfaces matching the JSON schema for type safety.

#### Scenario: TypeScript types available for import

- **WHEN** developer imports config types from `@yourorg/remote-config`
- **THEN** TypeScript types SHALL be available for `RemoteConfig`, `Remote`, `RemoteMetadata`
- **AND** types SHALL match JSON schema exactly

Example TypeScript usage:

```typescript
import type { RemoteConfig, Remote } from "@yourorg/remote-config";

const config: RemoteConfig = {
  remotes: [
    {
      name: "remoteWidget",
      entryUrl: "https://cdn.example.com/entry.js",
      scope: "default",
    },
  ],
};
```

### Requirement: Config SHALL support URL validation

The system SHALL validate that entryUrl and fallbackUrls are properly formatted URLs.

#### Scenario: HTTPS URLs accepted

- **WHEN** entryUrl is "https://cdn.example.com/entry.js"
- **THEN** the system SHALL accept the URL

#### Scenario: HTTP URLs accepted for development

- **WHEN** entryUrl is "http://localhost:5174/assets/remoteEntry.js"
- **THEN** the system SHALL accept the URL
- **AND** if NODE_ENV=production, the system SHALL emit warning about non-HTTPS URL

#### Scenario: Invalid URL scheme rejected

- **WHEN** entryUrl is "ftp://example.com/entry.js" or "//example.com/entry.js"
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' entryUrl must use http or https protocol"

#### Scenario: Relative URLs rejected

- **WHEN** entryUrl is "./assets/remoteEntry.js" or "/assets/remoteEntry.js"
- **THEN** the system SHALL reject the config
- **AND** error SHALL indicate "Remote '{name}' entryUrl must be absolute URL (include protocol and domain)"
