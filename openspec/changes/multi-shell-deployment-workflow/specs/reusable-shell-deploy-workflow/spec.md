# reusable-shell-deploy-workflow Delta

## ADDED Requirements

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
