# Tasks: sst-build-governance

Requirement IDs used below:

- **SSTG-1** — SST terminology SHALL be explicit (`SST Build`, `SST Integration`)
- **SSTG-2** — Exactly one SST Build SHALL be globally active for sign-off
- **SSTG-3** — SST Build promotion SHALL be access controlled
- **SSTG-4** — Active SST Build content SHALL be immutable
- **SSTG-5** — Blocker remediation SHALL create a new SST Build
- **SSTG-6** — SST Build identity and evidence SHALL be auditable with 180-day retention
- **SDP-1** — Shell release deploy SHALL preserve active SST Build immutability
- **SDP-2** — Shell release deploy SHALL support explicit SST Build promotion records
- **MDP-1** — MFE release deploy SHALL preserve active SST Build immutability
- **MDP-2** — MFE release deploy SHALL record resolved artifact evidence for SST Builds

## 1. Canonical SST policy docs

**Owns files:**

- `docs/release-process.md`
- `CONTEXT.md`

**Depends on:** none

- [ ] 1.1 Normalize terminology in release operations docs to use `SST Build` and `SST Integration` only.
  - Requirements: SSTG-1
  - Owner: team-lead
  - Verification: Grep shows no ambiguous plain `SST` usage in policy sections.
- [ ] 1.2 Document one-global-active-sign-off rule across multiple release branches.
  - Requirements: SSTG-2
  - Owner: team-lead
  - Verification: Release process includes explicit global active sign-off constraint.
- [ ] 1.3 Document promotion authority and blocker policy (N+1 build only).
  - Requirements: SSTG-3, SSTG-5
  - Owner: team-lead
  - Verification: Release process includes role restriction and no in-place patch rule.
- [ ] 1.4 Document canonical SST Build ID and 180-day evidence retention policy.
  - Requirements: SSTG-6
  - Owner: team-lead
  - Verification: ID format and retention period appear in release process and glossary.

## 2. Shell deployment guardrails and promotion metadata

**Owns files:**

- `.github/workflows/deploy-shell.yml`
- `scripts/azure/**` (if needed for evidence persistence wiring)

**Depends on:** task group 1 (policy terminology and constraints finalized)

- [x] 2.1 Add guardrail logic that prevents active SST Build artifact mutation during release-branch deploys.
  - Requirements: SSTG-4, SDP-1
  - Owner: backend-developer
  - Verification: Workflow test or dry-run demonstrates integration updates do not overwrite active SST Build artifacts.
- [x] 2.2 Add promotion metadata capture for shell SST Build records (canonical ID + manifest snapshot reference).
  - Requirements: SDP-2, SSTG-6
  - Owner: backend-developer
  - Verification: Promotion run emits canonical ID and manifest reference in logs/artifacts.
- [x] 2.3 Add authorization check hooks for promotion step (release manager or designated lead only).
  - Requirements: SSTG-3
  - Owner: backend-developer
  - Verification: Unauthorized actor simulation is denied with auditable message.

## 3. MFE deployment guardrails and evidence persistence

**Owns files:**

- `.github/workflows/deploy-mfes-turbo.yml`
- `scripts/azure/**` (MFE evidence bundle integration paths)

**Depends on:** task group 1 (policy terminology and constraints finalized)

- [ ] 3.1 Add guardrail logic that prevents active SST Build referenced MFE artifacts from mutation during release deploys.
  - Requirements: SSTG-4, MDP-1
  - Owner: backend-developer
  - Verification: Workflow validation confirms integration updates do not overwrite active SST Build referenced artifacts.
- [ ] 3.2 Persist resolved MFE artifact list per promoted SST Build and link it to canonical ID.
  - Requirements: MDP-2, SSTG-6
  - Owner: backend-developer
  - Verification: Promotion output includes resolvable evidence pointer keyed by SST Build ID.
- [ ] 3.3 Apply 180-day retention policy for SST evidence bundle paths.
  - Requirements: SSTG-6, MDP-2
  - Owner: backend-developer
  - Verification: Lifecycle configuration and docs demonstrate minimum 180-day retention.

## 4. Verification and operational rollout

**Owns files:**

- `docs/release-process.md` (verification checklist additions only)
- `tests/integration/**` (workflow and policy verification tests)

**Depends on:** task group 2 (shell guardrails), task group 3 (MFE guardrails)

- [ ] 4.1 Add integration tests for one-active-sign-off behavior with concurrent release-branch movement.
  - Requirements: SSTG-2, SSTG-4
  - Owner: tester
  - Verification: Test suite demonstrates active SST Build immutability while integration advances.
- [ ] 4.2 Add integration tests for blocker remediation flow producing SST Build N+1.
  - Requirements: SSTG-5
  - Owner: tester
  - Verification: Test shows failed build N remains immutable and promotion creates build N+1.
- [ ] 4.3 Add operational checklist for promotion, replacement, and retirement actions.
  - Requirements: SSTG-3, SSTG-6
  - Owner: team-lead
  - Verification: Checklist is present and references authoritative workflow steps.

## Execution waves

- Wave 1 (parallel): task group 1
- Wave 2 (parallel, after wave 1 merges): task groups 2, 3
- Wave 3 (serial, after wave 2 merges): task group 4

## Requirement coverage matrix

| Requirement | Covered by tasks        |
| ----------- | ----------------------- |
| SSTG-1      | 1.1                     |
| SSTG-2      | 1.2, 4.1                |
| SSTG-3      | 1.3, 2.3, 4.3           |
| SSTG-4      | 2.1, 3.1, 4.1           |
| SSTG-5      | 1.3, 4.2                |
| SSTG-6      | 1.4, 2.2, 3.2, 3.3, 4.3 |
| SDP-1       | 2.1                     |
| SDP-2       | 2.2                     |
| MDP-1       | 3.1                     |
| MDP-2       | 3.2, 3.3                |
