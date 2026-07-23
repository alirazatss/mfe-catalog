# Microfrontend Sample Specification

## ADDED Requirements

### Requirement: Follow mfe-\* naming convention

The system SHALL use `apps/mfes/mfe-*` naming pattern for all micro-frontends.

#### Scenario: Directory follows convention

- **WHEN** filesystem is inspected
- **THEN** `apps/mfes/mfe-widget/` directory exists
- **AND** `apps/mfes/remote-widget/` does NOT exist

#### Scenario: Package name is scoped

- **WHEN** `apps/mfes/mfe-widget/package.json` is read
- **THEN** name is `@mfe-runtine/mfe-widget`

#### Scenario: Root scripts reference correct package

- **WHEN** root `package.json` scripts are inspected
- **THEN** `dev:remote` uses filter `@mfe-runtine/mfe-widget`
- **AND** `build:remote` uses filter `@mfe-runtine/mfe-widget`

#### Scenario: Build works with new name

- **WHEN** `pnpm build` is run
- **THEN** `@mfe-runtine/mfe-widget` builds successfully
- **AND** Turborepo cache works for subsequent builds

#### Scenario: Module Federation scope unchanged

- **WHEN** `apps/mfes/mfe-widget/vite.config.ts` is read
- **THEN** federation name is still "remoteWidget"
- **AND** host can still consume the remote
