## ADDED Requirements

### Requirement: ConfigService Singleton

The system SHALL provide singleton ConfigService class accessible across shell and MFEs.

#### Scenario: Initialize config service

- **WHEN** shell calls configService.initialize(configData)
- **THEN** config service stores configuration
- **AND** config becomes available to all importers

#### Scenario: Get config value by key

- **WHEN** code calls configService.get('apiBaseUrl')
- **THEN** returns string value from config
- **AND** returns default if key not found

#### Scenario: Get entire config object

- **WHEN** code calls configService.getAll()
- **THEN** returns complete config object
- **AND** object is read-only (TypeScript enforces Readonly<Config>)

---

### Requirement: Type-Safe Config Access

The system SHALL enforce type safety for all config access.

#### Scenario: TypeScript autocomplete for config keys

- **WHEN** writing configService.get('...')
- **THEN** IDE autocompletes available config keys
- **AND** TypeScript validates key exists

#### Scenario: Return type inferred from key

- **WHEN** accessing configService.get('apiBaseUrl')
- **THEN** TypeScript infers return type as string
- **AND** accessing config.get('features.darkMode') infers boolean

---

### Requirement: Config Change Notifications

The system SHALL allow components to react to config changes (future hot-reload support).

#### Scenario: Subscribe to config changes

- **WHEN** component calls configService.onChange(callback)
- **THEN** callback invoked if config reloaded
- **AND** returns cleanup function to unsubscribe

---

### Requirement: Environment Property Access

The system SHALL expose current environment via config service.

#### Scenario: Get current environment

- **WHEN** code calls configService.getEnvironment()
- **THEN** returns 'development' | 'staging' | 'production'

#### Scenario: Check if development environment

- **WHEN** code calls configService.isDevelopment()
- **THEN** returns true if environment is 'development'
- **AND** returns false otherwise
