# azure-blob-storage-layout Specification

## Purpose

Defines the path structure, mutability rules, and lifecycle policies for artifacts stored in Azure Blob Storage (`tssmfestorage`) across dev and prod environments, including per-shell prefixes for multi-shell support.

## Requirements

### Requirement: Dev containers SHALL support three path families with distinct mutability rules

The system SHALL organize dev artifacts on `tssmfestorage` into three path families per deploy target: a mutable floating pointer (`<mfe-name>/dev/` for MFEs in `mfes-dev`, `<shell-name>/` for shells in `dev-shell`), immutable per-commit paths (`sha-<short-sha>/` nested under the target's prefix), and PR-scoped preview paths (`pr-<number>/` nested under the target's prefix). Floating pointers and preview paths MAY be overwritten by subsequent deploys of the same target; SHA paths SHALL never be overwritten after first write. No shell blob SHALL exist at the `dev-shell` container root outside a `<shell-name>/` prefix.

#### Scenario: Path families coexist for one MFE

- **GIVEN** `mfe-widget` has been deployed to dev from `main` and previewed from PR 42
- **WHEN** the blobs under `mfes-dev/mfe-widget/` are listed
- **THEN** the listing contains blobs under `dev/`, under `sha-<short-sha>/` prefixes, and under `pr-42/`
- **AND** no blob exists outside those three prefix families

#### Scenario: Path families coexist for one shell under its prefix

- **GIVEN** the `website` shell has been deployed to dev from `main` and previewed from PR 42
- **WHEN** the blobs under `dev-shell/website/` are listed
- **THEN** the listing contains floating blobs directly under `website/`, blobs under `website/sha-<short-sha>/`, and blobs under `website/pr-42/`
- **AND** no shell blob exists at the `dev-shell` container root

#### Scenario: SHA prefix is write-once

- **GIVEN** `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js` exists
- **WHEN** any workflow attempts a non-conditional overwrite of that blob
- **THEN** the conditional-upload policy used by dev deploy workflows prevents the overwrite (upload is skipped or fails; the blob is unchanged)

### Requirement: A lifecycle management policy SHALL expire preview and SHA artifacts

The system SHALL configure an Azure Storage lifecycle management policy on `tssmfestorage` that deletes blobs matching `pr-` prefixes (within `mfes-dev` and `dev-shell`, including shell-nested paths such as `dev-shell/<shell-name>/pr-<n>/`) 14 days after last modification, and blobs matching `sha-` prefixes (including shell-nested paths such as `dev-shell/<shell-name>/sha-<short-sha>/`) 30 days after last modification. The policy SHALL NOT match any blob in `mfes-prod` or `$web`, and SHALL NOT match shell floating-prefix blobs (blobs directly under `dev-shell/<shell-name>/`).

#### Scenario: Stale preview artifacts are removed by policy

- **GIVEN** PR 42's cleanup workflow failed and `dev-shell/website/pr-42/` blobs were last modified more than 14 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/website/pr-42/` are deleted

#### Scenario: Old SHA artifacts are removed by policy

- **GIVEN** `dev-shell/website/sha-a1b2c3d4/` blobs were last modified more than 30 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** blobs under `dev-shell/website/sha-a1b2c3d4/` are deleted

#### Scenario: Shell floating artifacts are never expired

- **GIVEN** `dev-shell/website/index.html` was last modified more than 30 days ago
- **WHEN** the lifecycle policy evaluation runs
- **THEN** the blob is not deleted

#### Scenario: Prod artifacts are never matched by the policy

- **GIVEN** blobs exist under `mfes-prod/mfe-widget/v1.2.0/` and `$web/website/v1.0.0/` older than 30 days
- **WHEN** the lifecycle policy evaluation runs
- **THEN** no blob in `mfes-prod` or `$web` is deleted by this policy

### Requirement: Prod shell artifacts SHALL live under per-shell prefixes in $web

The system SHALL upload prod shell builds to `$web/<shell-name>/...`, so multiple shells share the static-website container without collision. No shell blob SHALL be written at the `$web` container root by shell deploy workflows.

#### Scenario: Two shells coexist in $web

- **GIVEN** prod releases `website-v1.2.0` and `ccis-v0.1.0` have both deployed
- **WHEN** blobs in `$web` are listed
- **THEN** `website` artifacts exist only under `$web/website/` and `ccis` artifacts only under `$web/ccis/`

### Requirement: The website shell SHALL be migrated from container roots to its shell prefix exactly once

The system SHALL perform a one-time migration moving existing `website` shell artifacts from the `dev-shell` container root to `dev-shell/website/` (and prod artifacts to `$web/website/`), before any second shell deploys. After migration and a configurable grace period, root-level shell blobs SHALL be deleted so the root serves no stale build.

#### Scenario: Migration preserves the current build

- **GIVEN** `dev-shell/index.html` and `dev-shell/build-info.json` exist at the container root
- **WHEN** the migration completes
- **THEN** `dev-shell/website/index.html` serves the same build the root previously served
- **AND** `dev-shell/website/build-info.json` reports the same commit SHA

#### Scenario: Stale root is removed after grace period

- **GIVEN** the migration completed and the grace period elapsed
- **WHEN** blobs at the `dev-shell` container root are listed
- **THEN** no shell build blobs remain at the root outside `<shell-name>/` prefixes
