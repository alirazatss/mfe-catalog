# shell-deployment-pipeline Specification

## Purpose

TBD - created by archiving change dev-preview-deployments. Update Purpose after archive.

## Requirements

### Requirement: Shell dev deploy SHALL publish an immutable commit-SHA artifact alongside the container root

The system SHALL, on every dev shell deploy from `main`, upload the identical build output to container `dev-shell` at path `sha-<short-sha>/` on `tssmfestorage` (where `<short-sha>` is the first 8 characters of the commit SHA), in addition to overwriting the `dev-shell` container root. SHA-path uploads SHALL use conditional upload (fail-if-exists semantics) so an existing SHA path is never modified, and SHALL set `Cache-Control: public, max-age=31536000, immutable`.

#### Scenario: Dev shell deploy publishes both root and SHA path

- **GIVEN** commit `a1b2c3d4e5f6` modifying the shell is pushed to `main`
- **WHEN** the dev shell deploy job completes
- **THEN** `dev-shell/index.html` contains the new build
- **AND** `dev-shell/sha-a1b2c3d4/index.html` contains the same build
- **AND** the SHA-path blob response includes `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Re-run of the same commit does not modify the existing SHA path

- **GIVEN** `dev-shell/sha-a1b2c3d4/index.html` already exists
- **WHEN** the workflow run for commit `a1b2c3d4...` is re-run
- **THEN** blobs under `dev-shell/sha-a1b2c3d4/` remain byte-for-byte unchanged
- **AND** the container root is still refreshed
- **AND** the workflow does not fail the overall run

### Requirement: Shell dev deploy SHALL upload a build metadata file

The system SHALL upload a `build-info.json` file to both the `dev-shell` container root and the SHA path of every dev shell deploy. The file SHALL contain at minimum: the full commit SHA, the GitHub Actions run id, the workflow name, and an ISO-8601 UTC build timestamp.

#### Scenario: Metadata file is served from the dev shell root

- **GIVEN** a dev shell deploy for commit `a1b2c3d4e5f6...` completed in run `12345`
- **WHEN** a client fetches `https://tssmfestorage.blob.core.windows.net/dev-shell/build-info.json`
- **THEN** the response is valid JSON containing `"commitSha": "a1b2c3d4e5f6..."` (full SHA), `"runId": "12345"`, a workflow name, and an ISO-8601 UTC timestamp

### Requirement: Shell dev deploys SHALL serialize per target

The system SHALL configure a GitHub Actions concurrency group for the dev shell deploy job keyed by artifact and target environment, with `cancel-in-progress: false`, so that two runs writing the `dev-shell` root execute in commit order rather than racing.

#### Scenario: Rapid successive shell merges queue instead of racing

- **GIVEN** commit A and commit B both modifying the shell merge to `main` within seconds of each other
- **WHEN** both workflow runs reach the dev shell deploy job
- **THEN** the second run's deploy job waits until the first run's deploy job finishes
- **AND** after both complete, `dev-shell/build-info.json` reports commit B's SHA
