## ADDED Requirements

### Requirement: System SHALL resolve development ports from the canonical local port map

The system SHALL resolve development ports for discovered micro-frontends from the canonical local port map instead of relying on alphabetical assignment.

#### Scenario: Discovery returns mapped ports

- **GIVEN** the local port map resolves `mfe-dashboard` to `5174` and `mfe-widget` to `5175`
- **WHEN** discovery runs for both micro-frontends
- **THEN** the discovery result SHALL return `5174` for `mfe-dashboard`
- **AND** the discovery result SHALL return `5175` for `mfe-widget`

#### Scenario: Discovery allocates a port for a new app

- **GIVEN** a discovered micro-front-end has no resolved port in the local port map
- **WHEN** discovery runs
- **THEN** the system SHALL assign an available local port to that app
- **AND** the resolved port SHALL be included in the discovery result

## MODIFIED Requirements

### Requirement: Assign ports alphabetically

The system SHALL resolve development ports from the canonical local port map.

#### Scenario: Mapped ports are returned

- **GIVEN** the local port map resolves `mfe-dashboard` to `5174` and `mfe-widget` to `5175`
- **WHEN** discovery runs with `apps/mfes/mfe-dashboard/` and `apps/mfes/mfe-widget/`
- **THEN** discovery returns `mfe-dashboard` with port `5174`
- **AND** discovery returns `mfe-widget` with port `5175`

#### Scenario: New app gets a resolved port

- **GIVEN** `apps/mfes/mfe-chart/` exists but has no resolved port entry
- **WHEN** discovery runs
- **THEN** the system SHALL assign an available local port to `mfe-chart`
- **AND** the discovery result SHALL include the resolved port

### Requirement: Support custom port override

The system SHALL treat `package.json mfe.port` as a preferred local port and SHALL resolve an alternate available port when the preferred port is occupied.

#### Scenario: Preferred port is used when available

- **WHEN** package.json contains `{ "mfe": { "port": 5200 } }`
- **AND** port `5200` is available
- **THEN** discovery SHALL use port `5200`

#### Scenario: Preferred port falls back when occupied

- **WHEN** package.json contains `{ "mfe": { "port": 5200 } }`
- **AND** port `5200` is already in use
- **THEN** discovery SHALL assign another available port
- **AND** the resolved port SHALL be reflected in the discovery result

### Requirement: System SHALL extract optional MFE-specific config

The system SHALL read optional `mfe` field from package.json for micro-frontend-specific configuration.

#### Scenario: Custom scope specified

- **WHEN** package.json contains `{ "mfe": { "scope": "customScope" } }`
- **THEN** discovery SHALL extract scope as "customScope"
- **AND** scope SHALL be used for Module Federation configuration

#### Scenario: No mfe field uses local resolution defaults

- **WHEN** package.json does not contain `mfe` field
- **THEN** discovery SHALL derive scope from package name
- **AND** discovery SHALL resolve the port through the canonical local port map

## REMOVED Requirements

### Requirement: System SHALL assign development ports automatically

**Reason**: Replaced by canonical local port map resolution, which keeps local manifest URLs aligned with the resolved runtime port.
**Migration**: Use the canonical local port map as the source of truth for development ports.
