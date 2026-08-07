# shell-deployment-pipeline Specification

## Purpose

Defines the deployment pipeline for shell applications to Azure Blob Storage, including dev and prod deployments with per-shell prefixes, immutable SHA artifacts, and build metadata.

## Requirements

### Requirement: Shell dev deploy SHALL publish an immutable commit-SHA artifact alongside the container root

The system SHALL, on every dev shell deploy from `main`, upload the identical build output to container `dev-shell` at path `<shell-name>/sha-<short-sha>/` on `tssmfestorage` (where `<shell-name>` is the shell's blob path prefix, e.g. `website`, and `<short-sha>` is the first 8 characters of the commit SHA), in addition to overwriting the shell's floating prefix `dev-shell/<shell-name>/`. SHA-path uploads SHALL use conditional upload (fail-if-exists semantics) so an existing SHA path is never modified, and SHALL set `Cache-Control: public, max-age=31536000, immutable`. No shell blob SHALL be written at the `dev-shell` container root.

#### Scenario: Dev shell deploy publishes both floating prefix and SHA path

- **GIVEN** commit `a1b2c3d4e5f6` modifying the `website` shell is pushed to `main`
- **WHEN** the dev shell deploy job completes
- **THEN** `dev-shell/website/index.html` contains the new build
- **AND** `dev-shell/website/sha-a1b2c3d4/index.html` contains the same build
- **AND** the SHA-path blob response includes `Cache-Control: public, max-age=31536000, immutable`
- **AND** no blob is written at the `dev-shell` container root

#### Scenario: Re-run of the same commit does not modify the existing SHA path

- **GIVEN** `dev-shell/website/sha-a1b2c3d4/index.html` already exists
- **WHEN** the workflow run for commit `a1b2c3d4...` is re-run
- **THEN** blobs under `dev-shell/website/sha-a1b2c3d4/` remain byte-for-byte unchanged
- **AND** the floating prefix `dev-shell/website/` is still refreshed
- **AND** the workflow does not fail the overall run

#### Scenario: Shells are isolated by prefix

- **GIVEN** shells `website` and `ccis` both deploy to dev
- **WHEN** the `ccis` dev deploy completes
- **THEN** no blob under `dev-shell/website/` is created, modified, or deleted

### Requirement: Shell dev deploy SHALL upload a build metadata file

The system SHALL upload a `build-info.json` file to both the shell's floating prefix (`dev-shell/<shell-name>/`) and the SHA path (`dev-shell/<shell-name>/sha-<short-sha>/`) of every dev shell deploy. The file SHALL contain at minimum: the full commit SHA, the GitHub Actions run id, the workflow name, and an ISO-8601 UTC build timestamp.

#### Scenario: Metadata file is served from the shell's floating prefix

- **GIVEN** a dev deploy of the `website` shell for commit `a1b2c3d4e5f6...` completed in run `12345`
- **WHEN** a client fetches `https://tssmfestorage.blob.core.windows.net/dev-shell/website/build-info.json`
- **THEN** the response is valid JSON containing `"commitSha": "a1b2c3d4e5f6..."` (full SHA), `"runId": "12345"`, a workflow name, and an ISO-8601 UTC timestamp

### Requirement: Shell dev deploys SHALL serialize per target

The system SHALL configure a GitHub Actions concurrency group for the dev shell deploy job keyed by shell name and target environment (e.g., `deploy-website-dev`), with `cancel-in-progress: false`, so that two runs writing the same shell's floating prefix execute in commit order rather than racing, while deploys of different shells proceed independently.

#### Scenario: Rapid successive shell merges queue instead of racing

- **GIVEN** commit A and commit B both modifying the `website` shell merge to `main` within seconds of each other
- **WHEN** both workflow runs reach the dev shell deploy job
- **THEN** the second run's deploy job waits until the first run's deploy job finishes
- **AND** after both complete, `dev-shell/website/build-info.json` reports commit B's SHA

#### Scenario: Deploys of different shells do not serialize against each other

- **GIVEN** a `website` dev deploy is in progress
- **WHEN** a `ccis` dev deploy starts
- **THEN** the `ccis` deploy does not wait on the `website` deploy's concurrency group
