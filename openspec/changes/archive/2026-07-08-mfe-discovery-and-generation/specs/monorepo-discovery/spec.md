# Monorepo Discovery Specification

## ADDED Requirements

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

### Requirement: Assign ports alphabetically

The system SHALL assign development ports alphabetically starting at 5174.

#### Scenario: First micro-frontend gets port 5174

- **WHEN** only `apps/mfes/mfe-widget/` exists
- **THEN** mfe-widget gets port 5174

#### Scenario: Multiple micro-frontends get sequential ports

- **WHEN** `apps/mfes/mfe-dashboard/` and `apps/mfes/mfe-widget/` exist
- **THEN** mfe-dashboard gets port 5174 (alphabetically first)
- **AND** mfe-widget gets port 5175

---

### Requirement: Support custom port override

The system SHALL allow micro-frontends to specify custom port via package.json mfe.port field.

#### Scenario: Custom port respected

- **WHEN** package.json contains `"mfe": { "port": 5200 }`
- **THEN** MicroFrontend object has port 5200

#### Scenario: Port conflict detected

- **WHEN** two micro-frontends specify same custom port
- **THEN** discovery throws error indicating port conflict
- **AND** error message includes conflicting port number

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
