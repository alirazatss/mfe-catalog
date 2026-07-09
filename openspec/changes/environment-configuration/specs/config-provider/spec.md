## ADDED Requirements

### Requirement: Shell Initializes Config Provider
The system SHALL initialize configuration in shell before rendering app.

#### Scenario: Config loaded in main.tsx
- **WHEN** shell app starts
- **THEN** main.tsx calls loadConfig() before ReactDOM.render
- **AND** waits for config to load
- **AND** initializes configService with loaded config

#### Scenario: Loading state shown during config load
- **WHEN** config is loading
- **THEN** shell renders loading spinner
- **AND** routes are not rendered yet

---

### Requirement: Config Passed to MFEs via Props
The system SHALL pass configuration to MFEs via component props.

#### Scenario: Shell passes config to MFE
- **WHEN** shell renders MFE component
- **THEN** shell passes config as prop
- **AND** MFE receives config object

#### Scenario: MFE uses provided config
- **WHEN** MFE receives config prop
- **THEN** MFE can access config.apiBaseUrl
- **AND** MFE uses config for API calls

---

### Requirement: MFE Can Use Config Service Directly
The system SHALL allow MFEs to import configService singleton as alternative to props.

#### Scenario: MFE imports config service
- **WHEN** MFE imports configService from @mf-mono/config
- **THEN** MFE receives same instance as shell
- **AND** config values are accessible

---

### Requirement: Config Validation on Load
The system SHALL validate config structure matches expected interface.

#### Scenario: Valid config accepted
- **WHEN** loaded config has all required fields
- **THEN** config is accepted
- **AND** app proceeds normally

#### Scenario: Invalid config rejected
- **WHEN** loaded config missing required fields
- **THEN** system falls back to defaults
- **AND** logs validation errors with missing fields
