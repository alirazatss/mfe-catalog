# monorepo-discovery Specification

## Purpose

This specification defines the monorepo discovery system that automatically scans the filesystem for micro-frontends following the `apps/mfes/mfe-*` naming convention. The system extracts metadata from package.json files, resolves development ports from the canonical local port map, and derives Module Federation scopes while supporting custom overrides via the mfe configuration field.

## Requirements

### Requirement: Discover micro-frontends by filesystem pattern

The system SHALL automatically discover all micro-frontends by scanning for `apps/mfes/mfe-*/package.json` files.

#### Scenario: Single micro-frontend discovered

- **WHEN** discovery runs in a monorepo with `apps/mfes/mfe-widget/package.json`
- **THEN** discovery returns array with one MicroFrontend object
- **AND** object contains name, shortName, version, port, scope, path

#### Scenario: Multiple micro-frontends discovered

- **WHEN** discovery runs with `apps/mfes/mfe-widget/` and `apps/mfes/mfe-dashboard/`
- **THEN** discovery returns array with two MicroFrontend objects
- **AND** objects are sorted alphabetically by directory name

#### Scenario: No micro-frontends found

- **WHEN** discovery runs and no `apps/mfes/mfe-*/` directories exist
- **THEN** discovery returns empty array

---

### Requirement: Extract metadata from package.json

The system SHALL read package.json from each discovered micro-frontend and extract metadata.

#### Scenario: Extract standard fields

- **WHEN** package.json contains name, version, description
- **THEN** MicroFrontend object includes these exact values

#### Scenario: Handle missing optional fields

- **WHEN** package.json lacks description field
- **THEN** MicroFrontend object has description as undefined
- **AND** discovery does not throw error

---

### Requirement: Resolve ports from canonical local port map

The system SHALL resolve development ports from the canonical local port map.

#### Scenario: Mapped ports are returned

- **WHEN** the local port map resolves `mfe-dashboard` to `5174` and `mfe-widget` to `5175`
- **AND** discovery runs with `apps/mfes/mfe-dashboard/` and `apps/mfes/mfe-widget/`
- **THEN** discovery returns `mfe-dashboard` with port `5174`
- **AND** discovery returns `mfe-widget` with port `5175`

#### Scenario: New app gets a resolved port

- **WHEN** `apps/mfes/mfe-chart/` exists but has no resolved port entry
- **AND** discovery runs
- **THEN** the system SHALL assign an available local port to `mfe-chart`
- **AND** the discovery result SHALL include the resolved port

---

### Requirement: Support preferred port override

The system SHALL treat `package.json mfe.port` as a preferred local port and SHALL resolve an alternate available port when the preferred port is occupied.

#### Scenario: Preferred port is used when available

- **WHEN** package.json contains `{ "mfe": { "port": 5200 } }`
- **AND** port `5200` is available
- **THEN** discovery SHALL use port `5200`

#### Scenario: Preferred port falls back when occupied

- **WHEN** package.json contains `{ "mfe": { "port": 5200 } }`
- **AND** port `5200` is already in use
- **THEN** discovery SHALL assign another available port
- **AND** the resolved port SHALL be reflected in the discovery result

---

### Requirement: Derive scope from package name

The system SHALL derive Module Federation scope by converting package name to camelCase.

#### Scenario: Scoped package name converted

- **WHEN** package name is `@mfe-runtine/mfe-widget`
- **THEN** scope is `widget` (strips scope and mfe- prefix, camelCase)

#### Scenario: Multi-word name converted

- **WHEN** package name is `@mfe-runtine/mfe-user-profile`
- **THEN** scope is `userProfile` (camelCase conversion)

#### Scenario: Custom scope override

- **WHEN** package.json contains `"mfe": { "scope": "customScope" }`
- **THEN** scope is `customScope` (override takes precedence)

### Requirement: System SHALL discover micro-frontends by naming convention

The system SHALL scan `apps/` directory and identify any subdirectory matching `apps/mfes/mfe-*` pattern as a micro-frontend.

#### Scenario: Single micro-frontend discovered

- **WHEN** monorepo contains `apps/mfes/mfe-widget/` directory
- **THEN** discovery SHALL identify it as a micro-frontend
- **AND** discovery SHALL return array with one entry

#### Scenario: Multiple micro-frontends discovered

- **WHEN** monorepo contains `apps/mfes/mfe-widget/`, `apps/mfes/mfe-dashboard/`, `apps/mfes/mfe-chart/`
- **THEN** discovery SHALL identify all three as micro-frontends
- **AND** discovery SHALL return array with three entries in alphabetical order

#### Scenario: Non-matching directories ignored

- **WHEN** monorepo contains `apps/shells/website/`, `apps/admin/`, `apps/mfes/mfe-widget/`
- **THEN** discovery SHALL only identify `apps/mfes/mfe-widget/` as micro-frontend
- **AND** `apps/shells/website/` and `apps/admin/` SHALL be excluded

#### Scenario: Empty apps directory

- **WHEN** `apps/` directory contains no `mfe-*` subdirectories
- **THEN** discovery SHALL return empty array
- **AND** discovery SHALL emit warning "No micro-frontends found matching apps/mfes/mfe-\*"

### Requirement: System SHALL extract metadata from package.json

The system SHALL read each discovered micro-frontend's package.json and extract relevant metadata.

#### Scenario: Package.json metadata extracted

- **WHEN** `apps/mfes/mfe-widget/package.json` contains `{ "name": "@mfe-runtine/mfe-widget", "version": "1.0.0", "description": "Counter widget" }`
- **THEN** discovery SHALL extract name as "mfe-widget" (strip @mfe-runtine/ prefix)
- **AND** discovery SHALL extract version as "1.0.0"
- **AND** discovery SHALL extract description as "Counter widget"

#### Scenario: Missing package.json fails discovery

- **WHEN** `apps/mfes/mfe-dashboard/` directory exists but has no package.json
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit warning "apps/mfes/mfe-dashboard/ missing package.json"

#### Scenario: Invalid package.json fails discovery

- **WHEN** `apps/mfes/mfe-chart/package.json` contains invalid JSON
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit error "Failed to parse package.json in apps/mfes/mfe-chart/"

### Requirement: System SHALL validate required package.json fields

The system SHALL ensure each micro-frontend's package.json contains required fields.

#### Scenario: Required name field validated

- **WHEN** package.json is missing `name` field
- **THEN** discovery SHALL skip that directory
- **AND** discovery SHALL emit error "package.json in apps/mfes/mfe-{dir}/ missing required 'name' field"

#### Scenario: Required version field validated

- **WHEN** package.json is missing `version` field
- **THEN** discovery SHALL use default version "0.0.0"
- **AND** discovery SHALL emit warning "package.json in apps/mfes/mfe-{dir}/ missing 'version', using 0.0.0"

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

#### Scenario: No mfe field uses local resolution defaults

- **WHEN** package.json does not contain `mfe` field
- **THEN** discovery SHALL resolve the port through the canonical local port map
- **AND** discovery SHALL derive scope from package name

### Requirement: System SHALL resolve development ports from local port map

The system SHALL resolve development server ports for micro-frontends from the canonical local port map.

#### Scenario: Mapped ports are used

- **WHEN** discovering mfe-dashboard and mfe-widget with resolved ports 5174 and 5175
- **THEN** mfe-dashboard SHALL use port 5174
- **AND** mfe-widget SHALL use port 5175

#### Scenario: Preferred port override respected

- **WHEN** mfe-widget specifies `{ "mfe": { "port": 5200 } }`
- **THEN** the system SHALL attempt to use port 5200 as the preferred port
- **AND** the resolved port SHALL be recorded in the local port map

#### Scenario: Port conflict detected

- **WHEN** two micro-frontends specify same port
- **THEN** discovery SHALL emit error "Port conflict: apps/mfes/mfe-{a}/ and apps/mfes/mfe-{b}/ both use port {port}"
- **AND** discovery SHALL fail (exit with non-zero code)

### Requirement: System SHALL provide TypeScript API for discovery

The system SHALL expose programmatic API for discovering micro-frontends.

#### Scenario: Discovery function returns metadata

- **WHEN** calling `await discoverMicroFrontends()`
- **THEN** function SHALL return array of MicroFrontend objects
- **AND** each object SHALL include name, version, description, path, port, scope

Example TypeScript usage:

```typescript
import { discoverMicroFrontends } from "@mfe-runtine/monorepo-tools";

const mfes = await discoverMicroFrontends();
// [
//   {
//     name: 'mfe-widget',
//     version: '1.0.0',
//     description: 'Counter widget',
//     path: 'apps/mfes/mfe-widget',
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

- **WHEN** `apps/mfes/mfe-widget/vite.config.ts` exists
- **THEN** discovery SHALL mark micro-frontend as valid
- **AND** no warning SHALL be emitted

#### Scenario: Missing vite config warning

- **WHEN** `apps/mfes/mfe-widget/vite.config.ts` does not exist
- **THEN** discovery SHALL emit warning "apps/mfes/mfe-widget/ missing vite.config.ts"
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
mfe-dashboard 1.0.0    5174   apps/mfes/mfe-dashboard
mfe-widget    1.2.3    5175   apps/mfes/mfe-widget
```

#### Scenario: CLI with JSON output

- **WHEN** running `pnpm mfe:discover --json`
- **THEN** CLI SHALL output JSON array of micro-frontend metadata
- **AND** output SHALL be valid JSON parseable by other tools
