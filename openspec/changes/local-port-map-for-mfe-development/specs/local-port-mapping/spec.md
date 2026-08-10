## ADDED Requirements

### Requirement: System SHALL maintain a canonical local port map

The system SHALL maintain a canonical local port map that associates each shell and micro-frontend with a resolved local development port.

#### Scenario: Existing mapping is reused

- **GIVEN** the local port map contains a resolved port for `mfe-widget`
- **WHEN** local development starts for `mfe-widget`
- **THEN** the system SHALL use the mapped port for that app
- **AND** the resolved port SHALL remain available for local manifest generation

#### Scenario: New app is assigned a resolved port

- **GIVEN** the local port map does not contain an entry for a discovered shell or micro-frontend
- **WHEN** local development starts for that app
- **THEN** the system SHALL assign an available local port
- **AND** the system SHALL record the resolved port in the local port map

### Requirement: System SHALL resolve occupied preferred ports to another available port

The system SHALL resolve an alternate available local port when a preferred port in the local port map is already occupied.

#### Scenario: Preferred port is already in use

- **GIVEN** `mfe-widget` has preferred port `5174`
- **AND** port `5174` is already in use
- **WHEN** local development starts for `mfe-widget`
- **THEN** the system SHALL assign a different available port
- **AND** the system SHALL update the local port map with the resolved port

#### Scenario: Preferred port is available

- **GIVEN** `mfe-widget` has preferred port `5174`
- **AND** port `5174` is available
- **WHEN** local development starts for `mfe-widget`
- **THEN** the system SHALL use port `5174`
- **AND** the local port map SHALL keep `5174` as the resolved value for that app

### Requirement: System SHALL keep resolved ports stable while they remain available

The system SHALL reuse a previously resolved local port for an app when that port remains available.

#### Scenario: Restart reuses the same free port

- **GIVEN** `mfe-landing-page` was previously assigned port `5175`
- **AND** port `5175` is still available
- **WHEN** local development starts again for `mfe-landing-page`
- **THEN** the system SHALL reuse port `5175`
- **AND** the local port map SHALL remain unchanged for that app

#### Scenario: Previously resolved port becomes unavailable

- **GIVEN** `mfe-landing-page` was previously assigned port `5175`
- **AND** port `5175` is no longer available
- **WHEN** local development starts again for `mfe-landing-page`
- **THEN** the system SHALL assign another available port
- **AND** the local port map SHALL record the new resolved port

### Requirement: System SHALL generate local manifest URLs from the resolved port map

The system SHALL generate local manifest URLs from the resolved local port map so that manual edits are not required when a port changes.

#### Scenario: Generated manifest uses resolved port

- **GIVEN** the local port map resolves `mfe-widget` to `5174`
- **WHEN** the local manifest is generated
- **THEN** the manifest entry for `mfe-widget` SHALL use `http://localhost:5174/remoteEntry.js`

#### Scenario: Regenerated manifest reflects a new resolved port

- **GIVEN** `mfe-widget` was previously mapped to `5174`
- **AND** the system later resolves `mfe-widget` to `5176`
- **WHEN** the local manifest is regenerated
- **THEN** the manifest entry for `mfe-widget` SHALL use `http://localhost:5176/remoteEntry.js`

### Requirement: System SHALL fail when no available local port can be resolved

The system SHALL fail with an explicit error when it cannot resolve an available local port for an app.

#### Scenario: No free ports remain

- **GIVEN** the configured local port range is fully occupied
- **WHEN** local development starts for an app that needs a port
- **THEN** the system SHALL fail with a clear error
- **AND** the system SHALL not write a new resolved port for that app

#### Scenario: Invalid port map prevents resolution

- **GIVEN** the local port map cannot be parsed
- **WHEN** local development starts
- **THEN** the system SHALL fail with a clear error identifying the invalid map
