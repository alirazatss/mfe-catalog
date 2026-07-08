# monorepo-discovery Specification

## Purpose

Automatically discovers micro-frontends in the monorepo by scanning `apps/` directory for directories matching the `mfe-*` naming pattern. Extracts metadata from package.json to generate runtime configuration.

## ADDED Requirements

### Requirement: System SHALL discover micro-frontends by naming convention

The system SHALL scan `apps/` directory and identify any subdirectory matching `apps/mfe-*` pattern as a micro-frontend.

#### Scenario: Single micro-frontend discovered

- **WHEN** monorepo contains `apps/mfe-widget/` directory
- **THEN** discovery SHALL identify it as a micro-frontend
- **AND** discovery SHALL return array with one entry

#### Scenario: Multiple micro-frontends discovered

- **WHEN** monorepo contains `apps/mfe-widget/`, `apps/mfe-dashboard/`, `apps/mfe-chart/`
- **THEN** discovery SHALL identify all three as micro-frontends
- **AND** discovery SHALL return array with three entries in alphabetical order

#### Scenario: Non-matching directories ignored

- **WHEN** monorepo contains `apps/website/`, `apps/admin/`, `apps/mfe-widget/`
- **THEN** discovery SHALL only identify `apps/mfe-widget/` as micro-frontend
- **AND** `apps/website/` and `apps/admin/` SHALL be excluded

#### Scenario: Empty apps directory

- **WHEN** `apps/` directory contains no `mfe-*` subdirectories
- **THEN** discovery SHALL return empty array
- **AND** discovery SHALL emit warning "No micro-frontends found matching apps/mfe-\*"

### Requirement: System SHALL extract metadata from package.json

The system SHALL read each discovered micro-frontend's package.json and extract relevant metadata.

#### Scenario: Package.json metadata extracted

- **WHEN** `apps/mfe-widget/package.json` contains `{ "name": "@mf-mono/mfe-widget", "version": "1.0.0", "description": "Counter widget" }`
- **THEN** discovery SHALL extract name as "mfe-widget" (strip @mf-mono/ prefix)
- **AND** discovery SHALL extract version as "1.0.0"
- **AND** discovery SHALL extract description as "Counter widget"

#### Scenario: Missing package.json fails discovery

- **WHEN** `apps/mfe-dashboard/` directory exists but has no package.json
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit warning "apps/mfe-dashboard/ missing package.json"

#### Scenario: Invalid package.json fails discovery

- **WHEN** `apps/mfe-chart/package.json` contains invalid JSON
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit error "Failed to parse package.json in apps/mfe-chart/"

### Requirement: System SHALL validate required package.json fields

The system SHALL ensure each micro-frontend's package.json contains required fields.

#### Scenario: Required name field validated

- **WHEN** package.json is missing `name` field
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit error "package.json in apps/mfe-{dir}/ missing required 'name' field"

#### Scenario: Required version field validated

- **WHEN** package.json is missing `version` field
- **THEN** discovery SHALL use default version "0.0.0"
- **AND** discovery SHALL emit warning "package.json in apps/mfe-{dir}/ missing 'version', using 0.0.0"

### Requirement: System SHALL extract optional MFE-specific config

The system SHALL read optional `mfe` field from package.json for micro-frontend-specific configuration.

#### Scenario: Custom port specified

- **WHEN** package.json contains `{ "mfe": { "port": 5180 } }`
- **THEN** discovery SHALL extract port as 5180
- **AND** port SHALL be used for development URL generation

#### Scenario: Custom scope specified

- **WHEN** package.json contains `{ "mfe": { "scope": "customScope" } }`
- **THEN** discovery SHALL extract scope as "customScope"
- **AND** scope SHALL be used for Module Federation configuration

#### Scenario: No mfe field uses defaults

- **WHEN** package.json does not contain `mfe` field
- **THEN** discovery SHALL calculate port from alphabetical order
- **AND** discovery SHALL derive scope from package name

### Requirement: System SHALL assign development ports automatically

The system SHALL calculate development server ports for micro-frontends without explicit port config.

#### Scenario: Alphabetical port assignment

- **WHEN** discovering mfe-dashboard, mfe-widget (alphabetically)
- **THEN** mfe-dashboard SHALL be assigned port 5174
- **AND** mfe-widget SHALL be assigned port 5175

#### Scenario: Port override respected

- **WHEN** mfe-widget specifies `{ "mfe": { "port": 5200 } }`
- **THEN** mfe-widget SHALL use port 5200
- **AND** alphabetical assignment SHALL skip port 5200 for other apps

#### Scenario: Port conflict detected

- **WHEN** two micro-frontends specify same port
- **THEN** discovery SHALL emit error "Port conflict: apps/mfe-{a}/ and apps/mfe-{b}/ both use port {port}"
- **AND** discovery SHALL fail (exit with non-zero code)

### Requirement: System SHALL provide TypeScript API for discovery

The system SHALL expose programmatic API for discovering micro-frontends.

#### Scenario: Discovery function returns metadata

- **WHEN** calling `await discoverMicroFrontends()`
- **THEN** function SHALL return array of MicroFrontend objects
- **AND** each object SHALL include name, version, description, path, port, scope

Example TypeScript usage:

```typescript
import { discoverMicroFrontends } from "@mf-mono/monorepo-tools";

const mfes = await discoverMicroFrontends();
// [
//   {
//     name: 'mfe-widget',
//     version: '1.0.0',
//     description: 'Counter widget',
//     path: 'apps/mfe-widget',
//     port: 5174,
//     scope: 'mfeWidget'
//   }
// ]
```

#### Scenario: Discovery with custom options

- **WHEN** calling `await discoverMicroFrontends({ basePath: './apps', pattern: 'mfe-*' })`
- **THEN** function SHALL use provided options
- **AND** default basePath is 'apps/'
- **AND** default pattern is 'mfe-\*'

### Requirement: System SHALL detect vite.config.ts presence

The system SHALL verify each micro-frontend has required build configuration.

#### Scenario: Vite config present

- **WHEN** `apps/mfe-widget/vite.config.ts` exists
- **THEN** discovery SHALL mark micro-frontend as valid
- **AND** no warning SHALL be emitted

#### Scenario: Missing vite config warning

- **WHEN** `apps/mfe-widget/vite.config.ts` does not exist
- **THEN** discovery SHALL emit warning "apps/mfe-widget/ missing vite.config.ts"
- **AND** discovery SHALL still include micro-frontend (non-fatal)

### Requirement: System SHALL provide CLI tool for discovery

The system SHALL provide command-line tool for inspecting discovered micro-frontends.

#### Scenario: CLI lists discovered micro-frontends

- **WHEN** running `pnpm mfe:discover`
- **THEN** CLI SHALL output table of discovered micro-frontends with name, version, port, path
- **AND** CLI SHALL exit with code 0 if any found, code 1 if none found

Example output:

```
Found 2 micro-frontends:

Name          Version  Port   Path
mfe-dashboard 1.0.0    5174   apps/mfe-dashboard
mfe-widget    1.2.3    5175   apps/mfe-widget
```

#### Scenario: CLI with JSON output

- **WHEN** running `pnpm mfe:discover --json`
- **THEN** CLI SHALL output JSON array of micro-frontend metadata
- **AND** output SHALL be valid JSON parseable by other tools
