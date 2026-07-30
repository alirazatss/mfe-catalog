## ADDED Requirements

### Requirement: Shell repo SHALL contain one remote config file per supported environment

The system SHALL maintain `apps/shells/website/public/remotes.config.dev.json` and `apps/shells/website/public/remotes.config.prod.json` in git. Both files SHALL conform to the existing `remote-config-schema`. Neither file SHALL be generated at runtime; both SHALL be committed source.

#### Scenario: Both env config files exist and validate against schema

- **WHEN** the repository is inspected
- **THEN** both `remotes.config.dev.json` and `remotes.config.prod.json` exist
- **AND** both validate against the `remote-config-schema` JSON Schema

### Requirement: Dev config SHALL reference floating pointer URLs; prod config SHALL reference pinned versioned URLs

The system SHALL, in `remotes.config.dev.json`, set each MFE's `entryUrl` to `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe-name>/dev/remoteEntry.js`. The system SHALL, in `remotes.config.prod.json`, set each MFE's `entryUrl` to `https://tssmfestorage.blob.core.windows.net/mfes-prod/<mfe-name>/v<semver>/remoteEntry.js` where `<semver>` is a concrete semantic version (no wildcards, no `latest`, no floating pointers).

#### Scenario: Dev config uses floating URL

- **WHEN** `remotes.config.dev.json` is parsed
- **THEN** every `entryUrl` matches the pattern `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe-name>/dev/remoteEntry.js`

#### Scenario: Prod config pins concrete versions only

- **WHEN** `remotes.config.prod.json` is parsed
- **THEN** every `entryUrl` matches the pattern `https://tssmfestorage.blob.core.windows.net/mfes-prod/<mfe-name>/v<semver>/remoteEntry.js`
- **AND** no `entryUrl` contains the substrings `/dev/`, `/latest/`, or a version range operator (`^`, `~`, `*`)

### Requirement: MFE prod deploy SHALL open a PR modifying only the prod config for the affected MFE

The system SHALL, on successful prod artifact upload, open a pull request whose diff modifies only the `entryUrl` and `version` fields of the affected MFE's entry in `remotes.config.prod.json`. The pull request SHALL NOT modify `remotes.config.dev.json`, entries for other MFEs, or any file other than `remotes.config.prod.json`.

#### Scenario: PR diff scope is minimal

- **GIVEN** the prod deploy of `mfe-widget-v1.2.0` uploaded artifacts successfully
- **WHEN** the resulting pull request is inspected
- **THEN** the only modified file is `apps/shells/website/public/remotes.config.prod.json`
- **AND** within that file, only the `mfe-widget` entry's `entryUrl` and `version` fields are changed
- **AND** entries for other MFEs are unchanged

#### Scenario: PR title and body reference the version

- **GIVEN** the prod deploy of `mfe-widget-v1.2.0` uploaded artifacts successfully
- **WHEN** the resulting pull request is inspected
- **THEN** the PR title contains `mfe-widget` and `1.2.0`
- **AND** the PR body links back to the tag and the deploying workflow run

### Requirement: PR SHALL NOT be auto-merged

The system SHALL NOT enable auto-merge on the pull request opened by the prod deploy workflow. A human reviewer SHALL be required to merge before the shell picks up the new pinned version.

#### Scenario: PR requires human merge

- **GIVEN** the prod deploy PR has been opened
- **WHEN** the PR is inspected
- **THEN** auto-merge is not enabled
- **AND** the PR remains open until manually merged
