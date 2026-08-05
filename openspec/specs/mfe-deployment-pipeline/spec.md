# mfe-deployment-pipeline Specification

## Purpose

TBD - created by archiving change dev-preview-deployments. Update Purpose after archive.

## Requirements

### Requirement: MFE deployment SHALL use a unified workflow that scales to any number of MFEs

The system SHALL use a single GitHub Actions workflow file (`.github/workflows/deploy-mfes-turbo.yml`) that dynamically detects which MFEs changed or are being tagged, rather than requiring separate workflow files per MFE. Adding a new MFE SHALL NOT require creating or modifying workflow files. The legacy git-diff-based workflow (`.github/workflows/deploy-mfes.yml`) SHALL be removed so that exactly one workflow deploys MFEs for any given trigger.

#### Scenario: New MFE deploys without workflow changes

- **GIVEN** a new MFE `mfe-dashboard` is added to `apps/mfes/mfe-dashboard/` with a valid `package.json`
- **WHEN** the tag `mfe-dashboard-v1.0.0` is pushed
- **THEN** the unified workflow automatically extracts `mfe-dashboard` from the tag
- **AND** deploys to `mfes-prod/mfe-dashboard/v1.0.0/` without any workflow file modifications

#### Scenario: Multiple MFEs deploy in parallel when shared package changes

- **GIVEN** MFEs `mfe-widget` and `mfe-landing-page` both depend on `@mfe-runtime/dynamic-loader`
- **WHEN** a commit to `main` modifies `packages/dynamic-loader/**`
- **THEN** the unified workflow detects the shared package change via the Turborepo dependency graph
- **AND** builds a matrix containing both `mfe-widget` and `mfe-landing-page`
- **AND** deploys both MFEs to dev in parallel using GitHub Actions matrix strategy

#### Scenario: Exactly one workflow responds to an MFE deploy trigger

- **GIVEN** the repository default branch contains `.github/workflows/deploy-mfes-turbo.yml`
- **WHEN** a commit modifying `apps/mfes/mfe-widget/src/` is pushed to `main`
- **THEN** exactly one MFE deploy workflow run starts for that commit
- **AND** no workflow file named `deploy-mfes.yml` exists in `.github/workflows/`

### Requirement: MFE dev deploy SHALL publish an immutable commit-SHA artifact alongside the floating pointer

The system SHALL, on every dev deploy of an MFE from `main`, upload the identical build output to container `mfes-dev` at path `<mfe-name>/sha-<short-sha>/` on `tssmfestorage` (where `<short-sha>` is the first 8 characters of the commit SHA), in addition to overwriting the floating `<mfe-name>/dev/` pointer. SHA-path uploads SHALL use conditional upload (fail-if-exists semantics) so an existing SHA path is never modified, and SHALL set `Cache-Control: public, max-age=31536000, immutable`.

#### Scenario: Dev deploy publishes both pointer and SHA path

- **GIVEN** commit `a1b2c3d4e5f6` modifying `mfe-widget` is pushed to `main`
- **WHEN** the dev deploy job for `mfe-widget` completes
- **THEN** `mfes-dev/mfe-widget/dev/remoteEntry.js` contains the new build
- **AND** `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js` contains the same build
- **AND** the SHA-path blob response includes `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Re-run of the same commit does not modify the existing SHA path

- **GIVEN** `mfes-dev/mfe-widget/sha-a1b2c3d4/remoteEntry.js` already exists
- **WHEN** the workflow run for commit `a1b2c3d4...` is re-run
- **THEN** blobs under `mfes-dev/mfe-widget/sha-a1b2c3d4/` remain byte-for-byte unchanged
- **AND** the floating `dev/` pointer is still refreshed
- **AND** the workflow does not fail the overall run

### Requirement: MFE dev deploy SHALL upload a build metadata file

The system SHALL upload a `build-info.json` file to both the floating pointer path and the SHA path of every MFE dev deploy. The file SHALL contain at minimum: the full commit SHA, the GitHub Actions run id, the workflow name, and an ISO-8601 UTC build timestamp.

#### Scenario: Metadata file is served from the dev pointer

- **GIVEN** a dev deploy of `mfe-widget` for commit `a1b2c3d4e5f6...` completed in run `12345`
- **WHEN** a client fetches `mfes-dev/mfe-widget/dev/build-info.json`
- **THEN** the response is valid JSON containing `"commitSha": "a1b2c3d4e5f6..."` (full SHA), `"runId": "12345"`, a workflow name, and an ISO-8601 UTC timestamp

#### Scenario: Metadata identifies the SHA artifact

- **WHEN** a client fetches `mfes-dev/mfe-widget/sha-a1b2c3d4/build-info.json`
- **THEN** the `commitSha` field's first 8 characters equal `a1b2c3d4`

### Requirement: MFE dev deploys SHALL serialize per MFE and environment

The system SHALL configure a GitHub Actions concurrency group keyed by MFE name and target environment for every dev deploy job, with `cancel-in-progress: false`, so that two runs targeting the same floating pointer execute in commit order rather than racing.

#### Scenario: Rapid successive merges queue instead of racing

- **GIVEN** commit A and commit B both modifying `mfe-widget` merge to `main` within seconds of each other
- **WHEN** both workflow runs reach the `mfe-widget` dev deploy job
- **THEN** the second run's deploy job waits until the first run's deploy job finishes
- **AND** after both complete, `mfes-dev/mfe-widget/dev/build-info.json` reports commit B's SHA

#### Scenario: Deploys of different MFEs are not serialized against each other

- **GIVEN** one commit changes `mfe-widget` and another changes `mfe-landing-page`
- **WHEN** both dev deploy jobs run
- **THEN** neither job waits on the other's concurrency group
