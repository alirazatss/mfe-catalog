# reusable-shell-deploy-workflow Delta (release channels)

## ADDED Requirements

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
