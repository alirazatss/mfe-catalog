## ADDED Requirements

### Requirement: Runtime Config Loading

The system SHALL load configuration from JSON file at application startup.

#### Scenario: Load config for detected environment

- **WHEN** app initializes
- **THEN** system detects environment (dev/staging/production)
- **AND** system fetches /config/config.{env}.json
- **AND** system parses JSON into typed Config object

#### Scenario: Config load succeeds

- **WHEN** config file exists and is valid JSON
- **THEN** config is loaded successfully
- **AND** app proceeds with initialization

#### Scenario: Config load fails - file not found

- **WHEN** config file returns HTTP 404
- **THEN** system falls back to default config
- **AND** app logs warning but continues

#### Scenario: Config load fails - invalid JSON

- **WHEN** config file contains invalid JSON
- **THEN** system falls back to default config
- **AND** app logs error with details

---

### Requirement: Environment Detection

The system SHALL automatically detect environment from hostname.

#### Scenario: Development environment detected

- **WHEN** hostname is localhost or 127.0.0.1
- **THEN** environment is 'development'
- **AND** loads /config/config.dev.json

#### Scenario: Production environment detected

- **WHEN** hostname is production domain (e.g., app.example.com)
- **THEN** environment is 'production'
- **AND** loads /config/config.production.json

#### Scenario: Staging environment detected

- **WHEN** hostname is staging domain (e.g., staging.example.com)
- **THEN** environment is 'staging'
- **AND** loads /config/config.staging.json

#### Scenario: Manual environment override

- **WHEN** query parameter ?env=production is present
- **THEN** system uses production config
- **AND** overrides hostname-based detection

---

### Requirement: Config Service Singleton

The system SHALL provide singleton ConfigService accessible to shell and all MFEs.

#### Scenario: Get config value

- **WHEN** code calls configService.get('apiBaseUrl')
- **THEN** system returns configured API base URL
- **AND** value is type-safe (TypeScript knows it's a string)

#### Scenario: Get nested config value

- **WHEN** code calls configService.get('features.darkMode')
- **THEN** system returns boolean feature flag value

#### Scenario: Same instance shared across MFEs

- **WHEN** shell and MFE both import configService
- **THEN** both receive same singleton instance
- **AND** both see same config values

---

### Requirement: Type-Safe Config Interface

The system SHALL define TypeScript interface for all configuration values.

#### Scenario: Config interface includes API base URL

- **WHEN** accessing config.apiBaseUrl
- **THEN** TypeScript knows type is string
- **AND** autocomplete suggests 'apiBaseUrl' key

#### Scenario: Config interface includes auth endpoints

- **WHEN** accessing config.auth.loginUrl
- **THEN** TypeScript knows structure: auth: { loginUrl, logoutUrl, refreshUrl }

#### Scenario: Config interface includes feature flags

- **WHEN** accessing config.features
- **THEN** TypeScript knows each feature flag is boolean

---

### Requirement: Default Configuration Values

The system SHALL provide sensible defaults for all required config values.

#### Scenario: Default API base URL for development

- **WHEN** no config file loaded
- **THEN** apiBaseUrl defaults to 'http://localhost:3000/api'

#### Scenario: Default feature flags

- **WHEN** no config file loaded
- **THEN** all feature flags default to false (conservative defaults)

#### Scenario: Environment-specific config overrides defaults

- **WHEN** config file defines apiBaseUrl
- **THEN** file value overrides default
- **AND** unspecified values still use defaults

---

### Requirement: Config Loaded Before App Renders

The system SHALL ensure config is loaded before rendering application.

#### Scenario: Show loading screen while config loads

- **WHEN** app is initializing
- **AND** config is still loading
- **THEN** app shows loading indicator
- **AND** app does not render routes yet

#### Scenario: App renders after config ready

- **WHEN** config finishes loading
- **THEN** loading indicator disappears
- **AND** app renders with routes
- **AND** all components can access config immediately
