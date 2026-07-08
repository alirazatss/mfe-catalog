# Microfrontend Sample Specification

## ADDED Requirements

### Requirement: Follow mfe-\* naming convention

The system SHALL use `apps/mfe-*` naming pattern for all micro-frontends.

#### Scenario: Directory follows convention

- **WHEN** filesystem is inspected
- **THEN** `apps/mfe-widget/` directory exists
- **AND** `apps/remote-widget/` does NOT exist

#### Scenario: Package name is scoped

- **WHEN** `apps/mfe-widget/package.json` is read
- **THEN** name is `@mf-mono/mfe-widget`

#### Scenario: Root scripts reference correct package

- **WHEN** root `package.json` scripts are inspected
- **THEN** `dev:remote` uses filter `@mf-mono/mfe-widget`
- **AND** `build:remote` uses filter `@mf-mono/mfe-widget`

#### Scenario: Build works with new name

- **WHEN** `pnpm build` is run
- **THEN** `@mf-mono/mfe-widget` builds successfully
- **AND** Turborepo cache works for subsequent builds

#### Scenario: Module Federation scope unchanged

- **WHEN** `apps/mfe-widget/vite.config.ts` is read
- **THEN** federation name is still "remoteWidget"
- **AND** host can still consume the remote
