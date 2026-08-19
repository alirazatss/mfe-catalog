# shell-deployment-pipeline Delta

## ADDED Requirements

### Requirement: Shell release deploy SHALL preserve active SST Build immutability

When an SST Build is marked active, shell deployment workflows SHALL continue publishing release-branch updates to SST Integration paths without overwriting or mutating active SST Build artifacts.

#### Scenario: Shell deploy updates integration but not active SST Build

- **GIVEN** shell SST Build `4.10-12-a1b2c3d-9f84ab21` is active
- **AND** a new commit is merged into `release-4.10`
- **WHEN** the shell release deployment runs
- **THEN** shell artifacts for SST Integration are updated for the new commit
- **AND** artifacts addressed by SST Build `4.10-12-a1b2c3d-9f84ab21` are not modified

### Requirement: Shell release deploy SHALL support explicit SST Build promotion records

The shell deployment workflow SHALL support explicit promotion metadata for SST Builds, including canonical SST Build ID and manifest snapshot reference.

#### Scenario: Shell promotion emits SST Build metadata

- **WHEN** an authorized user promotes a shell candidate to SST Build
- **THEN** deployment records include canonical SST Build ID `<release-train>-<build-number>-<short-sha>-<manifest-hash>`
- **AND** records include a reference to the manifest snapshot used by validation
