# sst-build-governance Delta

## Purpose

Defines the policy contract for promoting, freezing, and validating immutable System Test Builds so release sign-off remains reproducible while release branches continue to evolve.

## ADDED Requirements

### Requirement: SST terminology SHALL be explicit and unambiguous

The system SHALL use `SST Build` to mean an immutable system test candidate and `SST Integration` to mean the mutable release-channel stream. Release and QA records SHALL NOT use plain `SST` without one of these qualifiers.

#### Scenario: Validation handoff uses qualified SST terms

- **WHEN** release management hands off a candidate to QA
- **THEN** the handoff record names the target as `SST Build`
- **AND** any concurrently moving stream is named `SST Integration`

### Requirement: Exactly one SST Build SHALL be globally active for sign-off

The system SHALL allow multiple release branches to maintain independent SST Build queues, but SHALL mark at most one SST Build as the active global sign-off target at any point in time.

#### Scenario: Multiple release branches with one active sign-off target

- **GIVEN** release branches `release-4.10` and `release-4.11` both have promoted SST Builds
- **WHEN** QA begins sign-off validation
- **THEN** exactly one of those SST Builds is marked active for global sign-off
- **AND** the other remains non-active until promoted to active status

### Requirement: SST Build promotion SHALL be access controlled

Only release managers or designated leads SHALL be permitted to promote, replace, or retire an active SST Build.

#### Scenario: Unauthorized promotion attempt

- **WHEN** a contributor without release-manager or designated-lead authority attempts SST Build promotion
- **THEN** the promotion is denied
- **AND** the system records the denied action in audit logs

### Requirement: Active SST Build content SHALL be immutable

Once an SST Build is active, ongoing merges and backports to release branches SHALL NOT mutate that active SST Build.

#### Scenario: Release branch advances while active SST Build stays frozen

- **GIVEN** SST Build `4.10-12-a1b2c3d-9f84ab21` is active
- **AND** new commits merge into `release-4.10`
- **WHEN** deployment jobs for those commits run
- **THEN** SST Integration updates
- **AND** SST Build `4.10-12-a1b2c3d-9f84ab21` remains unchanged

### Requirement: Blocker remediation SHALL create a new SST Build

If validation finds a blocker, the fix flow SHALL produce a new patch build and promote a new SST Build. The previously active SST Build SHALL NOT be modified in place.

#### Scenario: Blocker fix produces SST Build N+1

- **GIVEN** active SST Build `N` fails validation
- **WHEN** a blocker fix is merged and backported
- **THEN** a new SST Build `N+1` is promoted
- **AND** SST Build `N` is retired from active sign-off without mutation

### Requirement: SST Build identity and evidence SHALL be auditable

Every promoted SST Build SHALL publish a canonical identifier with format `<release-train>-<build-number>-<short-sha>-<manifest-hash>`, and SHALL retain an evidence bundle for at least 180 days.

#### Scenario: SST Build record is reproducible

- **WHEN** QA references a promoted SST Build
- **THEN** the build record includes release train, build number, commit SHA, and manifest hash in the canonical ID
- **AND** the record links an evidence bundle containing manifest snapshot, resolved artifact URLs, approver record, and test report
- **AND** the evidence remains retrievable for at least 180 days
