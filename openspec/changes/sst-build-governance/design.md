# Design: SST Build Governance

## Context

See proposal.md for motivation. The repository already supports release-channel deployments from `release-X.Y` branches while allowing continued backports. Without explicit SST governance, QA validation targets can drift as release channels update. The needed behavior is policy-first: immutable sign-off candidate semantics, controlled promotion authority, and reproducible evidence.

## Goals / Non-Goals

**Goals:**

- Define an immutable `SST Build` contract independent from mutable `SST Integration`.
- Preserve delivery throughput by allowing release-branch updates while QA validates a frozen candidate.
- Make sign-off reproducible via canonical build identity and retained evidence.
- Constrain promotion authority to release managers or designated leads.

**Non-Goals:**

- Replace the existing release-branch model.
- Introduce a new environment tier or branch naming scheme.
- Define product-specific QA test cases.

## Decisions

### D1: Separate mutable integration from immutable sign-off

The design distinguishes `SST Integration` (moving release-channel stream) from `SST Build` (frozen sign-off target). This enables ongoing merges without invalidating in-flight validation.

Alternatives considered:

- Full branch freeze during validation: rejected because it blocks delivery and backport velocity.
- Single mutable SST stream only: rejected because sign-off is not reproducible.

### D2: One global active sign-off SST Build

Multiple release branches may exist, but only one SST Build can be globally active for sign-off at a time. This matches the current QA operating model and avoids parallel sign-off ambiguity.

Alternatives considered:

- Per-branch simultaneous active sign-off: rejected for current process because QA validates one candidate at a time.

### D3: Promote-by-authority with explicit identity

Promotion is restricted to release managers or designated leads, and each build uses canonical ID `<release-train>-<build-number>-<short-sha>-<manifest-hash>`. The ID is required to anchor test evidence and rollback discussion.

Alternatives considered:

- Branch name as build identity: rejected because branch state is mutable.
- Commit SHA only: rejected because it omits manifest identity and build sequencing context.

### D4: Blocker fixes generate N+1, never mutate N

When QA finds a blocker, the fix path creates a new SST Build rather than modifying the active one in place. This preserves traceability of what was actually tested.

Alternatives considered:

- In-place patching of active build: rejected due to audit and reproducibility risk.

### D5: 180-day evidence retention

Each promoted SST Build must retain an evidence bundle for at least 180 days, including approver record, test report, manifest snapshot, and resolved artifact list.

Alternatives considered:

- 30/90-day retention: rejected because historical validation and release audits can exceed those windows.

## Risks / Trade-offs

- [Risk] Additional operational steps for promotion and evidence handling.
  - Mitigation: Add standardized checklist and automation-backed metadata capture.
- [Risk] Partial enforcement if workflow guardrails are documented but not implemented.
  - Mitigation: Add CI/CD tasks to enforce non-overwrite behavior and promotion authority.
- [Risk] Team members use plain `SST` and reintroduce ambiguity.
  - Mitigation: Update docs and templates to require qualified terms.

## Migration Plan

1. Document canonical SST governance in release-process and glossary artifacts.
2. Add workflow-level controls that prevent active SST Build mutation during release-branch deploys.
3. Add promotion metadata capture and evidence bundle persistence.
4. Roll out release-manager checklist for promotion, blocker handling, and retirement.
5. Validate governance with one pilot release branch before broad adoption.

Rollback strategy:

- Governance docs can be reverted independently.
- Workflow controls can be feature-flagged or disabled while preserving existing release-channel deploy behavior.
