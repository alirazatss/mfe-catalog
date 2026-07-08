# Turborepo Integration Specification

## ADDED Requirements

### Requirement: Install Turborepo as dev dependency

The system SHALL include Turborepo as a development dependency in the monorepo.

#### Scenario: Turborepo installed successfully

- **WHEN** package.json is inspected
- **THEN** `turbo` appears in devDependencies with version ^2.0.0 or higher

#### Scenario: Turbo CLI is available

- **WHEN** running `pnpm turbo --version`
- **THEN** the command succeeds and outputs version number

---

### Requirement: Configure task pipeline

The system SHALL define a task pipeline in turbo.json for build, dev, and test tasks.

#### Scenario: turbo.json exists with tasks configuration

- **WHEN** turbo.json is inspected
- **THEN** it contains a `tasks` object (not deprecated `pipeline`)
- **AND** tasks includes `build`, `dev`, and `test` configurations

#### Scenario: Build task has correct configuration

- **WHEN** turbo.json tasks.build is inspected
- **THEN** it includes `dependsOn: ["^build"]` for topological ordering
- **AND** it includes `outputs: ["dist/**", ".next/**"]` for caching

#### Scenario: Dev task has correct configuration

- **WHEN** turbo.json tasks.dev is inspected
- **THEN** it includes `cache: false` to disable caching for watch mode

---

### Requirement: Update root scripts to use Turborepo

The system SHALL update root package.json scripts to invoke turbo commands.

#### Scenario: Build script uses turbo

- **WHEN** root package.json scripts.build is inspected
- **THEN** the command is `turbo build` or `turbo run build`

#### Scenario: Dev script uses turbo

- **WHEN** root package.json scripts.dev is inspected
- **THEN** the command is `turbo dev` or `turbo run dev`

#### Scenario: Test script uses turbo

- **WHEN** root package.json scripts.test is inspected
- **THEN** the command is `turbo test` or `turbo run test`

---

### Requirement: Enable local caching

The system SHALL configure local filesystem caching for build artifacts.

#### Scenario: Cache directory is gitignored

- **WHEN** .gitignore is inspected
- **THEN** it contains `.turbo/` entry

#### Scenario: Cached build is instant

- **WHEN** running `pnpm build` twice consecutively
- **THEN** the second run completes in under 100ms
- **AND** output shows "FULL TURBO" or cache hit indicators

---

### Requirement: Build verification

The system SHALL successfully build all workspace packages using Turborepo.

#### Scenario: Build succeeds for all packages

- **WHEN** running `pnpm build`
- **THEN** the command exits with code 0
- **AND** all workspace packages are built successfully

#### Scenario: Build respects topological order

- **WHEN** running `pnpm build`
- **THEN** dependencies are built before dependents
- **AND** `^build` ensures packages wait for upstream builds

#### Scenario: Incremental build only rebuilds changed packages

- **WHEN** a single package source file is modified
- **AND** `pnpm build` is run again
- **THEN** only the changed package and its dependents are rebuilt
- **AND** unchanged packages show cache hits
