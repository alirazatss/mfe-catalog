# azure-blob-storage-layout Delta (release channels)

## RENAMED Requirements

- FROM: `### Requirement: Dev containers SHALL support three path families with distinct mutability rules`
- TO: `### Requirement: Dev containers SHALL support four path families with distinct mutability rules`

- FROM: `### Requirement: A lifecycle management policy SHALL expire preview and SHA artifacts`
- TO: `### Requirement: A lifecycle management policy SHALL expire preview, SHA, and release-channel artifacts`

## MODIFIED Requirements

### Requirement: Dev containers SHALL support four path families with distinct mutability rules

The system SHALL organize dev artifacts on `tssmfestorage` into four path families per deploy target: a mutable floating pointer (`<mfe-name>/dev/` for MFEs in `mfes-dev`, `<shell-name>/` for shells in `dev-shell`), mutable release-channel prefixes (`release-<major.minor>/` nested under the target's prefix), immutable per-commit paths (`sha-<short-sha>/` nested under the target's prefix or under a release-channel prefix), and PR-scoped preview paths (`pr-<number>/` nested under the target's prefix). Floating pointers, release-channel roots, and preview paths MAY be overwritten by subsequent deploys of the same target and channel; SHA paths SHALL never be overwritten after first write. No shell blob SHALL exist at the `dev-shell` container root outside a `<shell-name>/` prefix.

#### Scenario: Path families coexist for one MFE

- **GIVEN** `mfe-widget` has been deployed to dev from `main`, deployed to channel `release-4.10`, and previewed from PR 42
- **WHEN** the blobs under `mfes-dev/mfe-widget/` are listed
- **THEN** the listing contains blobs under `dev/`, under `release-4.10/`, under `sha-<short-sha>/` prefixes, and under `pr-42/`
- **AND** no blob exists outside those four prefix families

#### Scenario: Path families coexist for one shell under its prefix

- **GIVEN** the `website` shell has been deployed to dev from `main`, deployed to channel `release-4.10`, and previewed from PR 42
- **WHEN** the blobs under `dev-shell/website/` are listed
- **THEN** the listing contains floating blobs directly under `website/`, blobs under `website/release-4.10/`, blobs under `website/sha-<short-sha>/`, and blobs under `website/pr-42/`
- **AND** no shell blob exists at the `dev-shell` container root

#### Scenario: Release channels are isolated from each other and from dev

- **GIVEN** `dev-shell/website/release-4.10/` and `dev-shell/website/release-4.11/` both contain builds
- **WHEN** a new commit deploys to channel `release-4.10`
- **THEN** only blobs under `dev-shell/website/release-4.10/` change
- **AND** the floating blobs directly under `dev-shell/website/` and the `release-4.11/` blobs are byte-identical to before

#### Scenario: SHA prefix is write-once

- **GIVEN** `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js` exists
- **WHEN** any workflow attempts a non-conditional overwrite of that blob
- **THEN** the conditional-upload policy used by dev deploy workflows prevents the overwrite (upload is skipped or fails; the blob is unchanged)

### Requirement: A lifecycle management policy SHALL expire preview, SHA, and release-channel artifacts

The system SHALL configure an Azure Storage lifecycle management policy on `tssmfestorage` that deletes blobs matching `pr-` prefixes (within `mfes-dev` and `dev-shell`, including shell-nested paths such as `dev-shell/<shell-name>/pr-<n>/`) 14 days after last modification, blobs matching `sha-` prefixes (including shell-nested and channel-nested paths such as `dev-shell/<shell-name>/sha-<short-sha>/` and `dev-shell/<shell-name>/release-<major.minor>/sha-<short-sha>/`) 30 days after last modification, and blobs matching `release-` prefixes (within `mfes-dev` and `dev-shell`, e.g., `dev-shell/<shell-name>/release-<major.minor>/`) 90 days after last modification, so end-of-life release lines are reaped automatically once deploys to them stop. The policy SHALL NOT match any blob in `mfes-prod` or `$web`, and SHALL NOT match shell floating-prefix blobs (blobs directly under `dev-shell/<shell-name>/`) or MFE `dev/` pointer blobs.

#### Scenario: Stale preview artifacts are removed by policy

- **GIVEN** PR 42's cleanup workflow failed and `dev-shell/website/pr-42/` blobs were last modified more than 14 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/website/pr-42/` are deleted

#### Scenario: Old SHA artifacts are removed by policy

- **GIVEN** `dev-shell/website/sha-a1b2c3d4/` blobs were last modified more than 30 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/website/sha-a1b2c3d4/` are deleted

#### Scenario: Dead release lines are reaped

- **GIVEN** no deploy has touched `dev-shell/website/release-4.8/` for more than 90 days
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/website/release-4.8/` are deleted

#### Scenario: Active release lines are retained

- **GIVEN** `dev-shell/website/release-4.11/` received a deploy 5 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** no blob under `dev-shell/website/release-4.11/` (other than expired nested `sha-` copies) is deleted

#### Scenario: Shell floating artifacts are never expired

- **GIVEN** `dev-shell/website/index.html` was last modified more than 30 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** the blob is not deleted

#### Scenario: Prod artifacts are never matched by the policy

- **GIVEN** blobs exist under `mfes-prod/mfe-widget/v1.2.0/` and `$web/website/v1.0.0/` older than 30 days
- **WHEN** the lifecycle policy evaluation runs
- **THEN** no blob in `mfes-prod` or `$web` is deleted by this policy
