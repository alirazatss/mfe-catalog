## ADDED Requirements

### Requirement: MFE deployment SHALL use a unified workflow that scales to any number of MFEs

The system SHALL use a single GitHub Actions workflow file (`.github/workflows/deploy-mfes.yml`) that dynamically detects which MFEs changed or are being tagged, rather than requiring separate workflow files per MFE. Adding a new MFE SHALL NOT require creating or modifying workflow files.

#### Scenario: New MFE deploys without workflow changes

- **GIVEN** a new MFE `mfe-dashboard` is added to `apps/mfes/mfe-dashboard/` with a valid `package.json`
- **WHEN** the tag `mfe-dashboard-v1.0.0` is pushed
- **THEN** the unified workflow automatically extracts `mfe-dashboard` from the tag
- **AND** deploys to `mfes-prod/mfe-dashboard/v1.0.0/` without any workflow file modifications

#### Scenario: Multiple MFEs deploy in parallel when shared package changes

- **GIVEN** MFEs `mfe-widget` and `mfe-landing-page` both depend on `@mfe-runtime/dynamic-loader`
- **WHEN** a commit to `main` modifies `packages/dynamic-loader/**`
- **THEN** the unified workflow detects the shared package change
- **AND** builds a matrix containing both `mfe-widget` and `mfe-landing-page`
- **AND** deploys both MFEs to dev in parallel using GitHub Actions matrix strategy

### Requirement: MFE deploy workflow SHALL trigger on push to `main` for dev environment

The system SHALL run the MFE deploy workflow with `dev` as target environment whenever a push to the `main` branch modifies files under the MFE's source directory (`apps/mfes/<mfe-name>/**`), packages the MFE consumes, or the workflow file itself.

#### Scenario: Push to main modifying MFE source triggers dev deploy

- **GIVEN** the MFE `mfe-widget` exists with a valid `package.json`
- **WHEN** a commit is pushed to `main` that modifies a file under `apps/mfes/mfe-widget/src/`
- **THEN** the unified MFE deploy workflow detects `mfe-widget` as changed and runs its `deploy-dev` job with `matrix.mfe=mfe-widget`
- **AND** the workflow uploads the build output to container `mfes-dev` on `tssmfestorage` at path `mfe-widget/dev/`

#### Scenario: Push to main not touching MFE is ignored

- **GIVEN** the MFE `mfe-widget` exists
- **WHEN** a commit is pushed to `main` that modifies only `apps/mfes/mfe-landing-page/**` files
- **THEN** the unified MFE deploy workflow detects only `mfe-landing-page` as changed and does not deploy `mfe-widget`

### Requirement: MFE prod deploy SHALL trigger only on git tags matching `<mfe-name>-v<semver>`

The system SHALL run the MFE deploy workflow with `prod` as target environment only when a git tag is pushed whose name matches the pattern `<mfe-name>-v<semver>` (e.g., `mfe-widget-v1.2.0`). The workflow SHALL dynamically extract the MFE name from the tag pattern. Any other tag pattern SHALL NOT trigger a prod deploy for that MFE.

#### Scenario: Matching tag triggers prod deploy

- **GIVEN** the tag `mfe-widget-v1.2.0` is pushed pointing at a commit on `main`
- **WHEN** GitHub processes the tag push event
- **THEN** the unified MFE deploy workflow extracts `mfe-widget` as the MFE name and `1.2.0` as the version
- **AND** the workflow runs its `deploy-prod` job targeting `mfe-widget` with version=`1.2.0`

#### Scenario: Non-matching tag does not trigger prod deploy

- **GIVEN** a tag `v1.2.0` (without MFE-name prefix) is pushed
- **WHEN** GitHub processes the tag push event
- **THEN** the MFE deploy workflow does not trigger (tag pattern `mfe-*-v*` does not match)

#### Scenario: Tag for a different MFE does not cross-trigger

- **GIVEN** the tag `mfe-landing-page-v0.3.0` is pushed
- **WHEN** GitHub processes the tag push event
- **THEN** the unified MFE deploy workflow extracts `mfe-landing-page` and deploys only that MFE
- **AND** `mfe-widget` is not deployed

### Requirement: Prod deploy workflow SHALL validate tag version matches `package.json` version

The system SHALL, before uploading any artifact, extract the semver from the git tag and compare it against the `version` field in the MFE's `package.json`. If they differ, the workflow SHALL fail with an explicit error and SHALL NOT upload any artifact or open any pull request.

#### Scenario: Matching versions proceed

- **GIVEN** the tag is `mfe-widget-v1.2.0` and `apps/mfes/mfe-widget/package.json` has `"version": "1.2.0"`
- **WHEN** the workflow runs its validation step
- **THEN** the step exits with status 0 and the workflow proceeds to upload

#### Scenario: Mismatched versions fail before upload

- **GIVEN** the tag is `mfe-widget-v1.2.0` and `apps/mfes/mfe-widget/package.json` has `"version": "1.1.0"`
- **WHEN** the workflow runs its validation step
- **THEN** the step exits non-zero
- **AND** no blob is uploaded to container `mfes-prod` on `tssmfestorage`
- **AND** no pull request is opened

### Requirement: Prod deploy SHALL refuse to overwrite an existing versioned path

The system SHALL upload versioned prod artifacts using a mode that fails if any blob at the target path already exists (conditional upload with `If-None-Match: *`). If a blob at container `mfes-prod` path `<mfe-name>/v<version>/` already exists on `tssmfestorage`, the workflow SHALL fail with an explicit error indicating the version is already published, and SHALL NOT modify any existing blob.

#### Scenario: First upload of a version succeeds

- **GIVEN** no blobs exist under `mfes-prod/mfe-widget/v1.2.0/` on `tssmfestorage`
- **WHEN** the workflow uploads the build output
- **THEN** all files are written to `mfes-prod/mfe-widget/v1.2.0/`
- **AND** the workflow exits with status 0

#### Scenario: Re-uploading an existing version fails

- **GIVEN** `mfes-prod/mfe-widget/v1.2.0/remoteEntry.js` already exists on `tssmfestorage`
- **WHEN** the workflow attempts to upload the same version
- **THEN** the upload step exits non-zero with an error naming the existing version
- **AND** no existing blob is modified or replaced
- **AND** no pull request is opened

### Requirement: Dev deploy SHALL overwrite the floating pointer path

The system SHALL upload dev artifacts to container `mfes-dev` at path `<mfe-name>/dev/` on `tssmfestorage`, replacing any prior contents at that path. Dev deploys SHALL set `Cache-Control: no-cache, must-revalidate` on every uploaded blob.

#### Scenario: Dev deploy replaces prior dev artifacts

- **GIVEN** `mfes-dev/mfe-widget/dev/remoteEntry.js` already exists from a previous deploy
- **WHEN** the dev deploy workflow runs
- **THEN** the file is replaced with the new build output
- **AND** the response includes `Cache-Control: no-cache, must-revalidate`

### Requirement: Prod versioned artifacts SHALL be uploaded with long-lived immutable cache headers

The system SHALL set `Cache-Control: public, max-age=31536000, immutable` on every blob uploaded to `mfes-prod/<mfe-name>/v<version>/` on `tssmfestorage`.

#### Scenario: Prod upload sets immutable cache header

- **GIVEN** the prod deploy workflow uploads `mfes-prod/mfe-widget/v1.2.0/remoteEntry.js`
- **WHEN** a client fetches that blob
- **THEN** the response includes `Cache-Control: public, max-age=31536000, immutable`

### Requirement: Successful prod MFE deploy SHALL open a pull request updating `remotes.config.prod.json`

After the artifact upload step succeeds, the system SHALL open a pull request against the default branch of the repository that updates `apps/shells/website/public/remotes.config.prod.json` to point the affected MFE's `entryUrl` at the newly published versioned path. The workflow SHALL automatically discover the route path for the MFE from the existing config file. The pull request SHALL NOT be auto-merged.

#### Scenario: PR is opened after successful upload

- **GIVEN** the prod deploy of `mfe-widget-v1.2.0` uploaded artifacts successfully
- **WHEN** the workflow reaches its post-upload step
- **THEN** a pull request is opened whose diff modifies only `apps/shells/website/public/remotes.config.prod.json`
- **AND** the modified `entryUrl` for `mfe-widget` equals `https://tssmfestorage.blob.core.windows.net/mfes-prod/mfe-widget/v1.2.0/remoteEntry.js`
- **AND** the pull request is not auto-merged

#### Scenario: Workflow discovers route automatically

- **GIVEN** `remotes.config.prod.json` has an entry at route `/widget` with `entryUrl` containing `mfe-widget`
- **WHEN** the prod deploy workflow for `mfe-widget-v1.2.0` creates a PR
- **THEN** the workflow automatically discovers `/widget` as the route
- **AND** updates `.features["/widget"].entryUrl` and `.features["/widget"].version` in the config

#### Scenario: PR is not opened when upload fails

- **GIVEN** the prod deploy upload step fails (for any reason)
- **WHEN** the workflow terminates
- **THEN** no pull request is opened
