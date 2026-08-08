# App Scaffolding

## ADDED Requirements

### Requirement: Generated apps consume shared packages

The MFE and shell generators SHALL emit thin-wrapper sources that import from the shared packages instead of copying boilerplate: generated `bootstrap.ts` uses `createMFELifecycle` from `@mfe-runtime/dynamic-loader`, generated `vite.config.ts` uses the factories from `@mfe-runtime/monorepo-tools`, generated `vitest.config.ts` uses the `@mfe-runtime/test-utils` preset, and generated shell boot code uses `@mfe-runtime/shell-kit`.

#### Scenario: Generated MFE is a thin wrapper

- **GIVEN** a newly generated MFE
- **WHEN** its `bootstrap.ts`, `vite.config.ts`, and `vitest.config.ts` are inspected
- **THEN** each delegates to the corresponding shared-package factory and contains no copied federation, lifecycle, or coverage boilerplate

#### Scenario: Generated shell uses shell-kit

- **GIVEN** a newly generated shell
- **WHEN** its boot sources are inspected
- **THEN** runtime-config, slot rendering, critical-error handling, auth bridge, and config loading are imported from `@mfe-runtime/shell-kit` with only shell-specific options defined locally

### Requirement: Scaffolded apps remain buildable and testable

Apps generated from the updated templates SHALL install, build, and pass their generated smoke tests using the shared packages, and the scaffolding drift guard SHALL continue to pass.

#### Scenario: Drift guard passes with thin templates

- **GIVEN** the updated templates
- **WHEN** the drift-guard CI job scaffolds a throwaway MFE and shell
- **THEN** both build successfully and their generated tests pass

#### Scenario: Generated app declares package dependencies

- **GIVEN** a newly generated app's `package.json`
- **WHEN** its dependencies are inspected
- **THEN** the shared packages it imports (`@mfe-runtime/dynamic-loader`, `@mfe-runtime/monorepo-tools`, `@mfe-runtime/test-utils`, and for shells `@mfe-runtime/shell-kit`) are declared as workspace dependencies
