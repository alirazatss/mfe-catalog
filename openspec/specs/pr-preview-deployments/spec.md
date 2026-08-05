# pr-preview-deployments Specification

## Purpose

TBD - created by archiving change dev-preview-deployments. Update Purpose after archive.

## Requirements

### Requirement: Same-repo pull requests SHALL deploy changed MFEs to PR-scoped preview paths

The system SHALL, when a pull request originating from a branch in the same repository is opened or synchronized, detect changed MFEs via the Turborepo dependency graph and upload each changed MFE's build output to container `mfes-dev` at path `<mfe-name>/pr-<pr-number>/` on `tssmfestorage`. Subsequent pushes to the same PR SHALL overwrite that PR's preview path. Preview blobs SHALL set `Cache-Control: no-cache, must-revalidate`.

#### Scenario: PR touching one MFE deploys only that MFE's preview

- **GIVEN** PR 42 from branch `feature/x` in the same repository modifies `apps/mfes/mfe-widget/src/App.tsx`
- **WHEN** the preview workflow runs
- **THEN** the build output is uploaded to `mfes-dev/mfe-widget/pr-42/`
- **AND** no blob is written under `mfes-dev/mfe-landing-page/pr-42/`
- **AND** no blob under any `dev/` or `sha-*/` prefix is modified

#### Scenario: New push to the PR refreshes the preview

- **GIVEN** `mfes-dev/mfe-widget/pr-42/remoteEntry.js` exists from an earlier push to PR 42
- **WHEN** a new commit is pushed to PR 42's branch
- **THEN** `mfes-dev/mfe-widget/pr-42/remoteEntry.js` is replaced with the new build
- **AND** `mfes-dev/mfe-widget/pr-42/build-info.json` reports the new head commit SHA

#### Scenario: PR with no MFE changes deploys no MFE preview

- **GIVEN** PR 43 modifies only `docs/**`
- **WHEN** the preview workflow runs
- **THEN** the change-detection step reports zero changed MFEs
- **AND** no blob is uploaded to `mfes-dev`

### Requirement: Same-repo pull requests that affect the shell or any MFE SHALL deploy a preview shell with a PR-scoped remote config

The system SHALL, for a qualifying same-repo pull request, build the shell and upload it to container `dev-shell` at path `pr-<pr-number>/` on `tssmfestorage`. The build SHALL embed an auto-generated `remotes.config.json` in which each MFE changed in the PR points at `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe-name>/pr-<pr-number>/remoteEntry.js`, and every MFE not changed in the PR retains its shared dev pointer URL (`.../mfes-dev/<mfe-name>/dev/remoteEntry.js`).

#### Scenario: Preview shell config points changed MFE at its preview

- **GIVEN** PR 42 modifies `mfe-widget` but not `mfe-landing-page`
- **WHEN** the preview shell deploy completes
- **THEN** `dev-shell/pr-42/remotes.config.json` sets the `/widget` entry's `entryUrl` to `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js`
- **AND** the `/` (landing page) entry's `entryUrl` remains `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js`

#### Scenario: Shell-only PR previews the shell against shared dev MFEs

- **GIVEN** PR 44 modifies only `apps/shells/website/src/**`
- **WHEN** the preview workflow runs
- **THEN** the shell build is uploaded to `dev-shell/pr-44/`
- **AND** every `entryUrl` in `dev-shell/pr-44/remotes.config.json` points at a `mfes-dev/<mfe-name>/dev/` path

### Requirement: Fork pull requests SHALL NOT receive deploy credentials or produce preview deployments

The system SHALL restrict preview deployment jobs to pull requests whose head repository equals the base repository. For fork pull requests, no job requesting Azure OIDC credentials SHALL run.

#### Scenario: Fork PR produces no deployment

- **GIVEN** a pull request is opened from a fork of the repository
- **WHEN** the preview workflow is evaluated for that PR
- **THEN** every job that requests Azure credentials is skipped
- **AND** no blob is uploaded to any container on `tssmfestorage`

#### Scenario: Same-repo PR passes the boundary check

- **GIVEN** a pull request whose head branch lives in the base repository
- **WHEN** the preview workflow is evaluated
- **THEN** the deploy jobs are eligible to run

### Requirement: Preview deploys SHALL upload build metadata and report preview URLs on the pull request

The system SHALL upload a `build-info.json` (full commit SHA, GitHub Actions run id, workflow name, ISO-8601 UTC timestamp, PR number) to every preview path it writes, and SHALL create or update a single sticky comment on the pull request listing the preview shell URL and each deployed MFE preview `remoteEntry.js` URL.

#### Scenario: Sticky comment lists preview URLs

- **GIVEN** PR 42's preview deploy published `mfe-widget` and the preview shell
- **WHEN** the preview workflow completes
- **THEN** PR 42 has exactly one preview comment authored by the workflow
- **AND** the comment contains `https://tssmfestorage.blob.core.windows.net/dev-shell/pr-42/index.html`
- **AND** the comment contains `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js`

#### Scenario: Subsequent push updates the existing comment

- **GIVEN** PR 42 already has a preview comment
- **WHEN** a new push triggers another preview deploy
- **THEN** the existing comment is updated in place
- **AND** no second preview comment is created

### Requirement: Closing a pull request SHALL delete its preview artifacts

The system SHALL, when a pull request is closed (merged or not), run a cleanup workflow that deletes all blobs under `mfes-dev/<mfe-name>/pr-<pr-number>/` for every MFE and under `dev-shell/pr-<pr-number>/`. Cleanup SHALL NOT touch `dev/`, `sha-*/`, or any other PR's paths.

#### Scenario: PR close removes exactly this PR's blobs

- **GIVEN** blobs exist under `mfes-dev/mfe-widget/pr-42/`, `dev-shell/pr-42/`, and `mfes-dev/mfe-widget/pr-43/`
- **WHEN** PR 42 is closed
- **THEN** all blobs under `mfes-dev/mfe-widget/pr-42/` and `dev-shell/pr-42/` are deleted
- **AND** blobs under `mfes-dev/mfe-widget/pr-43/` and `mfes-dev/mfe-widget/dev/` are unchanged

#### Scenario: Cleanup of a PR with no preview artifacts succeeds

- **GIVEN** PR 45 never produced a preview deployment
- **WHEN** PR 45 is closed
- **THEN** the cleanup workflow completes with status success
- **AND** no blob is deleted

### Requirement: Preview deploys SHALL serialize per pull request

The system SHALL configure a GitHub Actions concurrency group keyed by PR number for preview deploy runs, with `cancel-in-progress: true`, so a superseded preview build for the same PR is cancelled in favor of the newest push.

#### Scenario: Rapid pushes to one PR keep only the newest preview run

- **GIVEN** two pushes land on PR 42's branch within seconds
- **WHEN** the second preview run starts
- **THEN** the first run is cancelled if still in progress
- **AND** after completion, `dev-shell/pr-42/build-info.json` reports the newest commit SHA

#### Scenario: Previews for different PRs run in parallel

- **GIVEN** PR 42 and PR 43 both receive pushes
- **WHEN** both preview runs execute
- **THEN** neither run waits on or cancels the other
