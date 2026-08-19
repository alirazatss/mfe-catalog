# mfe-deployment-pipeline Delta

## ADDED Requirements

### Requirement: MFE release deploy SHALL preserve active SST Build immutability

When an SST Build is marked active, MFE deployment workflows SHALL continue publishing release-branch updates to SST Integration paths without overwriting or mutating active SST Build artifacts referenced by the active build.

#### Scenario: MFE deploy updates integration but not active SST Build

- **GIVEN** active SST Build `4.10-12-a1b2c3d-9f84ab21` references `mfe-widget` artifact `sha-a1b2c3d4`
- **AND** a new commit is merged into `release-4.10`
- **WHEN** MFE release deployment runs
- **THEN** SST Integration for `mfe-widget` is updated for the new commit
- **AND** artifact `sha-a1b2c3d4` referenced by the active SST Build is not modified

### Requirement: MFE release deploy SHALL record resolved artifact evidence for SST Builds

For each promoted SST Build, the system SHALL persist the resolved MFE artifact list used by validation and retain the evidence for at least 180 days.

#### Scenario: Promoted SST Build keeps resolved MFE evidence

- **WHEN** an SST Build is promoted
- **THEN** the system stores the resolved list of MFE artifact URLs used by that build
- **AND** the evidence is associated with the SST Build ID
- **AND** the evidence remains retrievable for at least 180 days
