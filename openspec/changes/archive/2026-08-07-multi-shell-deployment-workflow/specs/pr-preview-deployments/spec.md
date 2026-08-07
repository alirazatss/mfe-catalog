# pr-preview-deployments Delta

## MODIFIED Requirements

### Requirement: Same-repo pull requests that affect the shell or any MFE SHALL deploy a preview shell with a PR-scoped remote config

The system SHALL, for a qualifying same-repo pull request, detect affected shells across all directories under `apps/shells/*`, build each affected shell, and upload it to container `dev-shell` at path `<shell-name>/pr-<pr-number>/` on `tssmfestorage`. Each preview shell build SHALL embed an auto-generated `remotes.config.json` in which each MFE changed in the PR points at `https://tssmfestorage.blob.core.windows.net/mfes-dev/<mfe-name>/pr-<pr-number>/remoteEntry.js`, and every MFE not changed in the PR retains its shared dev pointer URL (`.../mfes-dev/<mfe-name>/dev/remoteEntry.js`). Shells not affected by the PR SHALL NOT be built or uploaded.

#### Scenario: Preview shell config points changed MFE at its preview

- **GIVEN** PR 42 modifies `mfe-widget` but not `mfe-landing-page`
- **WHEN** the preview shell deploy completes for the `website` shell
- **THEN** `dev-shell/website/pr-42/remotes.config.json` sets the `/widget` entry's `entryUrl` to `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js`
- **AND** the `/` (landing page) entry's `entryUrl` remains `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-landing-page/dev/remoteEntry.js`

#### Scenario: Shell-only PR previews the shell against shared dev MFEs

- **GIVEN** PR 44 modifies only `apps/shells/website/src/**`
- **WHEN** the preview workflow runs
- **THEN** the shell build is uploaded to `dev-shell/website/pr-44/`
- **AND** every `entryUrl` in `dev-shell/website/pr-44/remotes.config.json` points at a `mfes-dev/<mfe-name>/dev/` path

#### Scenario: PR touching one shell does not preview other shells

- **GIVEN** shells `website` and `ccis` exist and PR 46 modifies only `apps/shells/ccis/src/**`
- **WHEN** the preview workflow runs
- **THEN** a preview shell is uploaded to `dev-shell/ccis/pr-46/`
- **AND** no blob is written under `dev-shell/website/pr-46/`

### Requirement: Preview deploys SHALL upload build metadata and report preview URLs on the pull request

The system SHALL upload a `build-info.json` (full commit SHA, GitHub Actions run id, workflow name, ISO-8601 UTC timestamp, PR number) to every preview path it writes, and SHALL create or update a single sticky comment on the pull request listing each deployed preview shell URL (`.../dev-shell/<shell-name>/pr-<pr-number>/index.html`) and each deployed MFE preview `remoteEntry.js` URL.

#### Scenario: Sticky comment lists preview URLs

- **GIVEN** PR 42's preview deploy published `mfe-widget` and the `website` preview shell
- **WHEN** the preview workflow completes
- **THEN** PR 42 has exactly one preview comment authored by the workflow
- **AND** the comment contains `https://tssmfestorage.blob.core.windows.net/dev-shell/website/pr-42/index.html`
- **AND** the comment contains `https://tssmfestorage.blob.core.windows.net/mfes-dev/mfe-widget/pr-42/remoteEntry.js`

#### Scenario: Subsequent push updates the existing comment

- **GIVEN** PR 42 already has a preview comment
- **WHEN** a new push triggers another preview deploy
- **THEN** the existing comment is updated in place
- **AND** no second preview comment is created

### Requirement: Closing a pull request SHALL delete its preview artifacts

The system SHALL, when a pull request is closed (merged or not), run a cleanup workflow that deletes all blobs under `mfes-dev/<mfe-name>/pr-<pr-number>/` for every MFE and under `dev-shell/<shell-name>/pr-<pr-number>/` for every shell. Cleanup SHALL NOT touch floating prefixes, `sha-*/` paths, or any other PR's paths.

#### Scenario: PR close removes exactly this PR's blobs

- **GIVEN** blobs exist under `mfes-dev/mfe-widget/pr-42/`, `dev-shell/website/pr-42/`, and `mfes-dev/mfe-widget/pr-43/`
- **WHEN** PR 42 is closed
- **THEN** all blobs under `mfes-dev/mfe-widget/pr-42/` and `dev-shell/website/pr-42/` are deleted
- **AND** blobs under `mfes-dev/mfe-widget/pr-43/` and `mfes-dev/mfe-widget/dev/` are unchanged

#### Scenario: Cleanup covers previews of every shell

- **GIVEN** PR 47 produced preview shells under `dev-shell/website/pr-47/` and `dev-shell/ccis/pr-47/`
- **WHEN** PR 47 is closed
- **THEN** blobs under both `dev-shell/website/pr-47/` and `dev-shell/ccis/pr-47/` are deleted

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
- **AND** after completion, `dev-shell/website/pr-42/build-info.json` reports the newest commit SHA

#### Scenario: Previews for different PRs run in parallel

- **GIVEN** PR 42 and PR 43 both receive pushes
- **WHEN** both preview runs execute
- **THEN** neither run waits on or cancels the other
