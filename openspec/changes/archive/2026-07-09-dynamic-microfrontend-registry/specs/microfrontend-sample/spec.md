# microfrontend-sample Specification (Delta)

## ADDED Requirements

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
