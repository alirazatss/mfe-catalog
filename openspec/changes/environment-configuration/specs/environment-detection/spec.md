## ADDED Requirements

### Requirement: Hostname-Based Environment Detection

The system SHALL detect environment from window.location.hostname.

#### Scenario: Localhost detected as development

- **WHEN** hostname is 'localhost' or '127.0.0.1'
- **THEN** detected environment is 'development'

#### Scenario: Production domain detected

- **WHEN** hostname matches production pattern (e.g., app.example.com)
- **THEN** detected environment is 'production'

#### Scenario: Staging domain detected

- **WHEN** hostname matches staging pattern (e.g., staging.example.com)
- **THEN** detected environment is 'staging'

---

### Requirement: Query Parameter Override

The system SHALL allow manual environment override via URL query parameter.

#### Scenario: Override to production

- **WHEN** URL includes ?env=production
- **THEN** environment is 'production'
- **AND** hostname-based detection is ignored

#### Scenario: Invalid override ignored

- **WHEN** URL includes ?env=invalid-env
- **THEN** system falls back to hostname detection
- **AND** logs warning about invalid environment

---

### Requirement: Environment Validation

The system SHALL validate environment is one of allowed values.

#### Scenario: Valid environments accepted

- **WHEN** environment is 'development', 'staging', or 'production'
- **THEN** environment is valid

#### Scenario: Invalid environment rejected

- **WHEN** environment is anything else
- **THEN** system defaults to 'development'
- **AND** logs warning
