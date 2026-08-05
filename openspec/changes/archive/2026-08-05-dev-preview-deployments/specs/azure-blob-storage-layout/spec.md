## ADDED Requirements

### Requirement: Dev containers SHALL support three path families with distinct mutability rules

The system SHALL organize dev artifacts on `tssmfestorage` into three path families per deploy target: a mutable floating pointer (`dev/` for MFEs, container root for the shell), immutable per-commit paths (`sha-<short-sha>/`), and PR-scoped preview paths (`pr-<number>/`). Floating pointers and preview paths MAY be overwritten by subsequent deploys of the same target; SHA paths SHALL never be overwritten after first write.

#### Scenario: Path families coexist for one MFE

- **GIVEN** `mfe-widget` has been deployed to dev from `main` and previewed from PR 42
- **WHEN** the blobs under `mfes-dev/mfe-widget/` are listed
- **THEN** the listing contains blobs under `dev/`, under `sha-<short-sha>/` prefixes, and under `pr-42/`
- **AND** no blob exists outside those three prefix families

#### Scenario: SHA prefix is write-once

- **GIVEN** `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js` exists
- **WHEN** any workflow attempts a non-conditional overwrite of that blob
- **THEN** the conditional-upload policy used by dev deploy workflows prevents the overwrite (upload is skipped or fails; the blob is unchanged)

### Requirement: A lifecycle management policy SHALL expire preview and SHA artifacts

The system SHALL configure an Azure Storage lifecycle management policy on `tssmfestorage` that deletes blobs with prefix pattern `pr-` (within `mfes-dev` and `dev-shell`) 14 days after last modification, and blobs with prefix pattern `sha-` 30 days after last modification. The policy SHALL NOT match any blob in `mfes-prod` or `$web`.

#### Scenario: Stale preview artifacts are removed by policy

- **GIVEN** PR 42's cleanup workflow failed and `mfes-dev/mfe-widget/pr-42/` blobs were last modified more than 14 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `mfes-dev/mfe-widget/pr-42/` are deleted

#### Scenario: Old SHA artifacts are removed by policy

- **GIVEN** `dev-shell/sha-a1b2c3d4/` blobs were last modified more than 30 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/sha-a1b2c3d4/` are deleted

#### Scenario: Prod artifacts are never matched by the policy

- **GIVEN** blobs exist under `mfes-prod/mfe-widget/v1.2.0/` and `$web/v1.0.0/` older than 30 days
- **WHEN** the lifecycle policy evaluation runs
- **THEN** no blob in `mfes-prod` or `$web` is deleted by this policy
