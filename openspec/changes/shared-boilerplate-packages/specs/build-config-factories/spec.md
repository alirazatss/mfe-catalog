# Build Config Factories

## ADDED Requirements

### Requirement: MFE Vite config factory

`@mfe-runtime/monorepo-tools` SHALL export an MFE Vite config factory that produces the standard Module Federation remote configuration (federation plugin with shared react singletons, standard `optimizeDeps`, `remoteEntry.js` filename, esnext build target) from parameters: scope name, port, exposes map, optional extra plugins, and CSS strategy options.

#### Scenario: MFE adopts the factory

- **GIVEN** an MFE whose `vite.config.ts` calls the factory with its name, port, and exposes
- **WHEN** the MFE is built
- **THEN** the output contains a `remoteEntry.js` exposing the declared modules with react shared as a singleton

#### Scenario: No duplicated optimizeDeps blocks

- **GIVEN** the migrated MFEs
- **WHEN** their vite configs are inspected
- **THEN** each contains exactly one `optimizeDeps` definition supplied by the factory

#### Scenario: MFE adds a feature-specific plugin

- **GIVEN** an MFE passing an extra plugin (e.g., tailwindcss) to the factory
- **WHEN** the dev server and build run
- **THEN** the plugin is active alongside the standard federation setup

### Requirement: Shell Vite config factory

`@mfe-runtime/monorepo-tools` SHALL export a shell Vite config factory that produces the standard host configuration (asset copy behavior, environment-driven config selection) parameterized by shell name and deploy environment.

#### Scenario: Shell adopts the factory

- **GIVEN** the website shell using the factory in its `vite.config.ts`
- **WHEN** it is built for a given deploy environment
- **THEN** the build output matches the pre-migration output structure (same entry, copied config assets for that environment)

### Requirement: Migrated apps build identically

After migrating website, mfe-widget, and mfe-landing-page to the factories, production builds SHALL succeed and dev servers SHALL start on the same ports as before migration.

#### Scenario: Build parity

- **GIVEN** the migrated apps
- **WHEN** the workspace build task runs
- **THEN** all app builds succeed with `remoteEntry.js` (MFEs) and shell bundles emitted as before

#### Scenario: Port stability

- **GIVEN** the migrated MFEs
- **WHEN** their dev servers start
- **THEN** mfe-widget serves on 5174 and mfe-landing-page on 5175 as before
