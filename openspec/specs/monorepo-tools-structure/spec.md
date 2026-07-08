# monorepo-tools-structure Specification

## Purpose

This specification defines the structure and exports of the @mf-mono/monorepo-tools package. This package provides utilities for discovering micro-frontends in the monorepo and generating runtime configuration files. The package exports TypeScript types, placeholder discovery functions, and config generation utilities that will be fully implemented in Phase 2.

## Requirements

### Requirement: Package structure exists

The system SHALL include a @mf-mono/monorepo-tools package with proper TypeScript configuration.

#### Scenario: Package directory exists

- **WHEN** filesystem is inspected
- **THEN** `packages/monorepo-tools/` directory exists

#### Scenario: Package.json configured correctly

- **WHEN** `packages/monorepo-tools/package.json` is read
- **THEN** name is `@mf-mono/monorepo-tools`
- **AND** version is `0.1.0`
- **AND** dependencies include `glob` and `@mf-mono/remote-config`

#### Scenario: TypeScript configured correctly

- **WHEN** `packages/monorepo-tools/tsconfig.json` is inspected
- **THEN** strict mode is enabled
- **AND** target is ES2022 or higher
- **AND** moduleResolution is bundler

---

### Requirement: Type definitions exist

The system SHALL export TypeScript types for MicroFrontend, RemoteConfigEntry, and ConfigGenerationOptions.

#### Scenario: Types file exists

- **WHEN** `packages/monorepo-tools/src/types.ts` is read
- **THEN** it exports MicroFrontend interface
- **AND** it exports RemoteConfigEntry interface
- **AND** it exports RemoteConfig interface
- **AND** it exports ConfigGenerationOptions interface

#### Scenario: MicroFrontend type has required fields

- **WHEN** MicroFrontend type is inspected
- **THEN** it includes name, shortName, version, port, scope, and path fields

---

### Requirement: Placeholder functions exist

The system SHALL export placeholder functions for discoverMicroFrontends and generateConfig.

#### Scenario: Discovery module exists

- **WHEN** `packages/monorepo-tools/src/discovery.ts` is read
- **THEN** it exports discoverMicroFrontends function
- **AND** it exports toScopeName utility function

#### Scenario: Config generator module exists

- **WHEN** `packages/monorepo-tools/src/config-generator.ts` is read
- **THEN** it exports generateConfig function

#### Scenario: Main index exports all modules

- **WHEN** `packages/monorepo-tools/src/index.ts` is read
- **THEN** it re-exports from types.ts
- **AND** it re-exports from discovery.ts
- **AND** it re-exports from config-generator.ts

---

### Requirement: Package builds successfully

The system SHALL build the monorepo-tools package using vite-plus.

#### Scenario: Build produces output

- **WHEN** `pnpm build --filter @mf-mono/monorepo-tools` is run
- **THEN** the command exits with code 0
- **AND** `dist/index.mjs` is created
- **AND** `dist/index.d.mts` is created

#### Scenario: Build uses Turborepo cache

- **WHEN** `pnpm build` is run twice
- **THEN** second build shows cache hit for monorepo-tools
