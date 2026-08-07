# backport-automation Delta

## ADDED Requirements

### Requirement: Labeling a merged main PR SHALL open a cherry-pick PR against the named release branch

The system SHALL provide a GitHub Actions workflow that, when a pull request merged into `main` carries a label of the form `backport release-<major.minor>` (applied before or after merge), cherry-picks the merge's commits onto a new branch based on the named release branch and opens a pull request targeting that release branch. The backport PR SHALL reference the original PR and carry over its title with a `[backport release-<major.minor>]` marker. One label per target line SHALL be supported, so a single PR can be backported to multiple release branches.

#### Scenario: Single-target backport

- **GIVEN** PR #120 is merged into `main` with label `backport release-4.10`
- **WHEN** the backport workflow completes
- **THEN** a new PR targeting `release-4.10` exists containing the cherry-picked commits of PR #120
- **AND** the new PR body links back to PR #120

#### Scenario: Multi-target backport

- **GIVEN** a merged PR carries labels `backport release-4.10` and `backport release-4.11`
- **WHEN** the backport workflow completes
- **THEN** two backport PRs exist, one targeting each release branch

#### Scenario: Unlabeled merges are ignored

- **WHEN** a PR without any `backport` label is merged into `main`
- **THEN** the backport workflow performs no cherry-pick and opens no PR

### Requirement: Failed cherry-picks SHALL surface as actionable feedback instead of silent failure

When a cherry-pick cannot be applied cleanly, the workflow SHALL NOT open a broken PR; it SHALL comment on the original pull request identifying the target branch and the conflicting commits, so the author can backport manually.

#### Scenario: Conflict reported on the source PR

- **GIVEN** a merged PR labeled `backport release-4.10` whose commits conflict with `release-4.10`
- **WHEN** the backport workflow runs
- **THEN** no backport PR is opened for `release-4.10`
- **AND** a comment on the original PR states the cherry-pick failed for `release-4.10` and lists the conflicting commit SHAs
