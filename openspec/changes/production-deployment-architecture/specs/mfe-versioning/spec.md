## ADDED Requirements

### Requirement: Semantic Versioning for MFEs

The system SHALL assign semantic versions to each micro-frontend independently.

#### Scenario: Version format validation

- **WHEN** a micro-frontend is built
- **THEN** the version SHALL follow semver format (MAJOR.MINOR.PATCH)

#### Scenario: Independent versioning

- **WHEN** mfe-widget is at version 1.2.3 and mfe-products is at 2.0.1
- **THEN** each MFE SHALL maintain its own version independently
- **AND** updating mfe-widget to 1.2.4 SHALL NOT affect mfe-products version

#### Scenario: Version increment rules

- **WHEN** a micro-frontend has breaking changes
- **THEN** the MAJOR version SHALL be incremented
- **WHEN** new features are added without breaking changes
- **THEN** the MINOR version SHALL be incremented
- **WHEN** bug fixes are applied
- **THEN** the PATCH version SHALL be incremented

---

### Requirement: Version Detection from Package JSON

The system SHALL derive micro-frontend versions from package.json.

#### Scenario: Read version from package.json

- **WHEN** the build system processes a micro-frontend
- **THEN** it SHALL read the version field from the MFE's package.json
- **AND** use that version for the Azure Blob Storage path and manifest entry

#### Scenario: Missing version handling

- **WHEN** package.json lacks a version field
- **THEN** the build system SHALL fail with error "MFE package.json missing version field"

---

### Requirement: Version Pinning Support

The system SHALL allow pinning specific MFE versions in the manifest.

#### Scenario: Pin specific version

- **WHEN** manifest specifies mfe-widget version 1.2.3
- **THEN** the shell SHALL load exactly version 1.2.3 from Azure Blob Storage
- **AND** SHALL NOT automatically upgrade to newer versions

#### Scenario: Rollback via version change

- **WHEN** manifest is updated from mfe-widget 1.3.0 to 1.2.3
- **THEN** the shell SHALL load version 1.2.3 on next page refresh
- **AND** users SHALL see the rolled-back version immediately

---

### Requirement: Git Tag Creation on Release

The system SHALL create git tags for each versioned MFE release.

#### Scenario: Create git tag on deploy

- **WHEN** mfe-widget version 1.2.3 is deployed to production
- **THEN** the CI pipeline SHALL create git tag "mfe-widget-v1.2.3"
- **AND** tag SHALL point to the commit that was deployed

#### Scenario: Tag format validation

- **WHEN** creating a git tag for an MFE release
- **THEN** tag name SHALL follow format "<mfe-name>-v<version>"
- **AND** version SHALL match semver pattern

#### Scenario: Prevent duplicate tags

- **WHEN** attempting to deploy mfe-widget 1.2.3 and tag already exists
- **THEN** the CI pipeline SHALL fail with error "Tag mfe-widget-v1.2.3 already exists"
