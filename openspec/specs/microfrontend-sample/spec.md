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

### Requirement: Sample remotes SHALL provide example configurations

The sample remotes SHALL include example JSON configuration files demonstrating proper remote registration format.

#### Scenario: Example development config provided

- **WHEN** developer examines sample remote widget project
- **THEN** the project SHALL include `example.remotes.config.dev.json` file
- **AND** the file SHALL demonstrate localhost configuration for development
- **AND** the file SHALL include comments explaining each field

Example content:

```json
{
  "$schema": "../packages/remote-config/schema.json",
  "remotes": [
    {
      "name": "remoteWidget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js",
      "scope": "remoteWidget",
      "enabled": true,
      "metadata": {
        "version": "1.0.0",
        "description": "Sample counter widget for development"
      }
    }
  ]
}
```

#### Scenario: Example production config provided

- **WHEN** developer examines deployment documentation
- **THEN** the project SHALL include `example.remotes.config.prod.json` file
- **AND** the file SHALL demonstrate CDN configuration for production
- **AND** the file SHALL include fallback URLs for redundancy

Example content:

```json
{
  "$schema": "../packages/remote-config/schema.json",
  "remotes": [
    {
      "name": "remoteWidget",
      "entryUrl": "https://cdn.example.com/remote-widget/v1.0.0/assets/remoteEntry.js",
      "scope": "remoteWidget",
      "fallbackUrls": ["https://cdn-backup.example.com/remote-widget/v1.0.0/assets/remoteEntry.js"],
      "enabled": true,
      "priority": 10,
      "metadata": {
        "version": "1.0.0",
        "description": "Sample counter widget"
      }
    }
  ]
}
```

### Requirement: Sample SHALL demonstrate multi-remote configuration

The example configurations SHALL show how to register multiple remotes in a single config file.

#### Scenario: Multiple remotes in example config

- **WHEN** developer views example configuration
- **THEN** config SHALL include at least 2 different remotes
- **AND** each remote SHALL demonstrate different configuration patterns
- **AND** comments SHALL explain use cases for each pattern

Example:

```json
{
  "remotes": [
    {
      "name": "remoteWidget",
      "entryUrl": "http://localhost:5174/assets/remoteEntry.js",
      "scope": "remoteWidget",
      "metadata": { "description": "Simple widget with no fallbacks" }
    },
    {
      "name": "remoteChart",
      "entryUrl": "http://localhost:5175/assets/remoteEntry.js",
      "scope": "remoteChart",
      "fallbackUrls": ["http://localhost:5176/assets/remoteEntry.js"],
      "enabled": false,
      "metadata": { "description": "Chart widget (disabled for now)" }
    }
  ]
}
```

### Requirement: Sample SHALL include README with config instructions

The sample remote widget SHALL include documentation explaining how to update configurations.

#### Scenario: Configuration README provided

- **WHEN** developer opens sample remote widget README
- **THEN** README SHALL include section "Configuration Management"
- **AND** section SHALL explain how to add remote to host's config
- **AND** section SHALL include step-by-step deployment instructions

Required sections:

- How to add this remote to host's `remotes.config.json`
- How to deploy config updates without rebuilding
- How to test config changes locally
- How to verify remote loads correctly in host

### Requirement: Sample SHALL demonstrate config-driven feature toggling

The example SHALL show using the `enabled` flag for feature flagging.

#### Scenario: Disabled remote documented

- **WHEN** developer views example config
- **THEN** at least one remote SHALL have `enabled: false`
- **AND** comments SHALL explain using this for gradual rollouts
- **AND** documentation SHALL explain how to enable without rebuild

Example comment:

```json
{
  "name": "newFeature",
  "enabled": false, // Set to true to enable this feature without rebuild
  "entryUrl": "..."
}
```
