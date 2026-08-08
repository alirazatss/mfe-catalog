# Shared Test Utils

## ADDED Requirements

### Requirement: Shared test mocks and render helpers

`@mfe-runtime/test-utils` SHALL export auth-global mocks (`mockAuthGlobal`, `clearAuthGlobal`, `mockUser`) and a router-aware render helper (`renderWithRouter`) so apps do not maintain local copies of test infrastructure.

#### Scenario: MFE test mocks the auth global

- **GIVEN** a test importing `mockAuthGlobal` from `@mfe-runtime/test-utils`
- **WHEN** the test mounts a component that reads `window.__MFE_AUTH__`
- **THEN** the component observes the mocked authenticated state
- **AND** `clearAuthGlobal` restores a clean global afterwards

#### Scenario: Router-dependent component rendered in a test

- **GIVEN** a component using router navigation
- **WHEN** a test renders it with `renderWithRouter`
- **THEN** the component renders without a real browser history and route assertions can be made

### Requirement: Vitest config preset

`@mfe-runtime/test-utils` SHALL export a vitest config factory that encapsulates the repo-standard test block (happy-dom environment, v8 coverage with text/json/html reporters, standard exclusions) while accepting per-app overrides such as coverage thresholds and setup files.

#### Scenario: App adopts the preset

- **GIVEN** an app whose `vitest.config.ts` calls the preset factory with no overrides
- **WHEN** its test suite runs
- **THEN** tests execute under happy-dom with v8 coverage and the standard reporters and exclusions

#### Scenario: App overrides coverage thresholds

- **GIVEN** an app passing custom coverage thresholds to the factory
- **WHEN** coverage runs below those thresholds
- **THEN** the test run fails on the app's thresholds, not the preset defaults

### Requirement: Migrated apps consume shared test utils

The website shell, mfe-widget, and mfe-landing-page SHALL consume `@mfe-runtime/test-utils` for their vitest configuration and test mocks, and their pre-existing test suites SHALL pass unchanged in behavior.

#### Scenario: Duplicated vitest blocks removed

- **GIVEN** the migrated repo
- **WHEN** app vitest configs are inspected
- **THEN** each consists of a preset call plus app-specific overrides only, with no hand-copied coverage block

#### Scenario: Existing suites stay green

- **GIVEN** the test suites that passed before migration
- **WHEN** `vp test` (or the workspace test task) runs after migration
- **THEN** all previously passing tests still pass
