# reusable-shell-deploy-workflow Specification

## Purpose

This specification defines the reusable GitHub Actions deployment workflow (`.github/workflows/deploy-shell.yml`) that any shell invokes via a thin, shell-specific caller workflow. It covers input parameterization, tag/version validation, per-shell concurrency control, and release-channel deploys (dev vs. `release-<major.minor>` branches), so that adding a new shell or release line requires only a caller workflow, not changes to shared deploy logic.

## Requirements

### Requirement: Shell deployments SHALL be executed by a single reusable workflow parameterized per shell

The system SHALL provide a reusable GitHub Actions workflow (`.github/workflows/deploy-shell.yml`, trigger `workflow_call`) that performs all shell deployment logic — release tag version validation, dependency install, shell build, dev deploy (floating prefix, immutable SHA path, build metadata), prod deploy, and concurrency control. The workflow SHALL accept at minimum these inputs: `shell-name` (blob path prefix and identifier), `shell-path` (workspace path, e.g. `apps/shells/website`), `package-name` (pnpm filter target), and `tag-prefix` (e.g. `website-v`). No shell-specific value SHALL be hardcoded in the reusable workflow body.

#### Scenario: Two shells deploy through the same workflow definition

- **GIVEN** caller workflows exist for shells `website` and `ccis`, each passing their own inputs
- **WHEN** both callers run
- **THEN** both executions use `.github/workflows/deploy-shell.yml` with no duplicated deploy logic in either caller
- **AND** `website` artifacts land under `dev-shell/website/` and `ccis` artifacts under `dev-shell/ccis/`

#### Scenario: Reusable workflow rejects a missing required input

- **WHEN** a caller workflow invokes `deploy-shell.yml` without the `shell-name` input
- **THEN** the workflow run fails at validation before any build or upload step executes

### Requirement: Each shell SHALL have a thin caller workflow that defines only triggers and inputs

The system SHALL define one caller workflow per shell that declares its `push`/`tag` triggers (scoped to that shell's paths and tag prefix) and invokes the reusable workflow via `uses:` with that shell's inputs. Caller workflows SHALL NOT contain build, upload, or validation steps of their own.

#### Scenario: Adding a shell requires only a caller workflow

- **GIVEN** the reusable workflow exists and shell tooling is shell-agnostic
- **WHEN** a new shell `ccis` is added under `apps/shells/ccis`
- **THEN** enabling its deployment requires creating only a caller workflow declaring triggers (paths `apps/shells/ccis/**`, tags `ccis-v*`) and inputs
- **AND** no modification to `.github/workflows/deploy-shell.yml` is needed

#### Scenario: Shell-scoped triggers do not cross-fire

- **GIVEN** caller workflows for `website` and `ccis`
- **WHEN** a commit touching only `apps/shells/ccis/**` is pushed to `main`
- **THEN** the `ccis` caller runs and the `website` caller does not run

### Requirement: The reusable workflow SHALL validate release tags against the shell's package version

The system SHALL, for tag-triggered runs, verify that the tag matches `<tag-prefix><semver>` and that `<semver>` equals the `version` field of `<shell-path>/package.json`. On mismatch the workflow SHALL fail before any deploy step.

#### Scenario: Tag version matches package version

- **GIVEN** `apps/shells/ccis/package.json` has version `0.1.0`
- **WHEN** tag `ccis-v0.1.0` is pushed
- **THEN** validation passes and the prod deploy proceeds

#### Scenario: Tag version mismatch aborts the deploy

- **GIVEN** `apps/shells/ccis/package.json` has version `0.1.0`
- **WHEN** tag `ccis-v0.2.0` is pushed
- **THEN** the workflow fails at the validation job
- **AND** no blob is uploaded to any container

### Requirement: The reusable workflow SHALL key concurrency groups per shell and environment

The system SHALL derive the GitHub Actions concurrency group from the `shell-name` input and target environment (e.g., `deploy-<shell-name>-dev`), with `cancel-in-progress: false` for dev deploys, so deploys of the same shell serialize while deploys of different shells run in parallel.

#### Scenario: Different shells deploy in parallel

- **GIVEN** commits affecting `website` and `ccis` merge to `main` at the same time
- **WHEN** both dev deploy jobs run
- **THEN** neither job waits on the other's concurrency group

#### Scenario: Same shell deploys serialize

- **GIVEN** two commits affecting `website` merge to `main` within seconds
- **WHEN** both runs reach the dev deploy job
- **THEN** the second run's deploy waits until the first completes

### Requirement: The reusable shell deploy workflow SHALL accept a channel input selecting the dev destination

The reusable workflow SHALL accept a `channel` input identifying the deploy channel within the dev container. When `channel` is empty or `dev`, the destination SHALL be the shell's floating prefix `dev-shell/<shell-name>/`. When `channel` is `release-<major.minor>`, the destination SHALL be `dev-shell/<shell-name>/release-<major.minor>/`. Immutable SHA uploads and `build-info.json` SHALL be published under the channel prefix using the same rules as the dev channel.

#### Scenario: Release branch push deploys to its channel

- **GIVEN** a caller workflow maps branch `release-4.10` to `channel: release-4.10` for shell `website`
- **WHEN** a commit is pushed to `release-4.10`
- **THEN** the build is uploaded to `dev-shell/website/release-4.10/`
- **AND** the identical build is uploaded to `dev-shell/website/release-4.10/sha-<short-sha>/` with immutable cache headers
- **AND** `dev-shell/website/release-4.10/build-info.json` reports the commit SHA
- **AND** no blob under `dev-shell/website/` outside `release-4.10/` is modified

#### Scenario: Default channel behavior is unchanged

- **WHEN** the caller invokes the workflow without a `channel` input on a `main` push
- **THEN** the build deploys to `dev-shell/<shell-name>/` exactly as before this change

### Requirement: Caller workflows SHALL map release branches to channels declaratively

Each shell's caller workflow SHALL trigger on pushes to `release-*` branches (scoped to that shell's paths) and derive the `channel` input from the branch name (`github.ref_name`). No release-branch logic SHALL live in the reusable workflow beyond interpreting the `channel` input.

#### Scenario: Two release lines deploy independently

- **GIVEN** branches `release-4.10` and `release-4.11` both exist
- **WHEN** commits touching `apps/shells/website/**` are pushed to each branch
- **THEN** two deploys run, targeting `dev-shell/website/release-4.10/` and `dev-shell/website/release-4.11/` respectively
- **AND** neither deploy modifies the other channel's blobs

#### Scenario: Release push not touching the shell does not deploy it

- **WHEN** a commit touching only `docs/**` is pushed to `release-4.10`
- **THEN** no shell deploy workflow run starts

### Requirement: Release-branch deploys SHALL validate the branch name against the shell package version

The reusable workflow SHALL, for runs triggered from a `release-<major.minor>` branch, verify that `<shell-path>/package.json` has a version whose major.minor equals the branch's `<major.minor>`. On mismatch the workflow SHALL fail before any upload.

#### Scenario: Matching branch and version deploys

- **GIVEN** `apps/shells/website/package.json` has version `4.10.2`
- **WHEN** a commit is pushed to `release-4.10`
- **THEN** validation passes and the channel deploy proceeds

#### Scenario: Mismatched branch and version aborts

- **GIVEN** `apps/shells/website/package.json` has version `4.11.0`
- **WHEN** a commit is pushed to `release-4.10`
- **THEN** the workflow fails at validation
- **AND** no blob is uploaded

### Requirement: Channel deploys SHALL serialize per shell and channel

The concurrency group for a channel deploy SHALL be keyed by shell name and channel (e.g., `deploy-website-release-4.10`), with `cancel-in-progress: false`, so deploys of the same channel queue in commit order while different channels and shells deploy in parallel.

#### Scenario: Same channel queues, different channels run in parallel

- **GIVEN** two commits land on `release-4.10` and one commit lands on `release-4.11`, all touching the `website` shell
- **WHEN** the three deploy runs execute
- **THEN** the two `release-4.10` deploys run sequentially in commit order
- **AND** the `release-4.11` deploy does not wait on either
