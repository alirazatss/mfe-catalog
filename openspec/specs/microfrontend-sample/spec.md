# microfrontend-sample Specification

## Purpose

TBD - created by archiving change module-federation-microfrontend. Update Purpose after archive.

## Requirements

### Requirement: Sample widget SHALL demonstrate microfrontend integration

A sample React widget SHALL be created to demonstrate end-to-end microfrontend functionality.

#### Scenario: Sample widget renders in host

- **WHEN** the host application loads the sample widget
- **THEN** the widget SHALL render successfully
- **AND** the widget SHALL display interactive content
- **AND** the widget SHALL maintain its own state

#### Scenario: Sample widget updates independently

- **WHEN** the sample widget code is updated and rebuilt
- **THEN** the host application SHALL load the new version
- **AND** the update SHALL not require rebuilding the host
- **AND** the widget SHALL function correctly with the new code

#### Scenario: Sample widget shows counter functionality

- **WHEN** the sample widget is rendered
- **THEN** the widget SHALL display a counter with current value
- **AND** increment/decrement buttons SHALL be visible
- **AND** clicking buttons SHALL update the counter state
- **AND** the counter state SHALL be isolated from host application state

### Requirement: Sample widget SHALL demonstrate prop passing

The sample widget SHALL accept props from the host application to demonstrate data flow.

#### Scenario: Widget receives props from host

- **WHEN** the host passes props to the sample widget
- **THEN** the widget SHALL receive and display the prop values
- **AND** prop types SHALL be validated
- **AND** TypeScript types SHALL ensure type safety

#### Scenario: Widget with missing props

- **WHEN** the host does not provide required props
- **THEN** the widget SHALL use default prop values
- **AND** the widget SHALL not crash
- **AND** a warning SHALL be logged in development mode

### Requirement: Sample widget SHALL include styling

The sample widget SHALL demonstrate CSS isolation and theming in microfrontend architecture.

#### Scenario: Widget has scoped styles

- **WHEN** the sample widget is loaded in the host
- **THEN** the widget's styles SHALL not conflict with host styles
- **AND** the widget SHALL maintain its visual appearance
- **AND** CSS modules or scoped styles SHALL be used

#### Scenario: Widget supports theme customization

- **WHEN** the host passes theme configuration to the widget
- **THEN** the widget SHALL apply the theme colors
- **AND** the widget SHALL respect theme variables
- **AND** the widget SHALL re-render when theme changes

### Requirement: Development workflow SHALL support hot reload

The sample widget SHALL support hot module replacement during development.

#### Scenario: Widget code changes in development

- **WHEN** a developer modifies the widget source code
- **THEN** the changes SHALL be reflected without full page reload
- **AND** the widget state SHALL be preserved if possible
- **AND** the update SHALL occur within 3 seconds

#### Scenario: Both host and remote running concurrently

- **WHEN** both host and remote dev servers are running
- **THEN** changes to either codebase SHALL trigger HMR
- **AND** the federation connection SHALL remain active
- **AND** the developer SHALL see changes immediately in the browser

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
