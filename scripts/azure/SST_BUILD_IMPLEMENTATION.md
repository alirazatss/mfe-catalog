# SST Build Governance - Implementation Guide

This document describes the **stub implementation** of SST Build governance guardrails for shell deployments and outlines the infrastructure required for full production deployment.

## Current State: Stub Implementation

The current implementation provides **integration points** and **documented placeholders** for SST Build governance features defined in:

- `openspec/changes/sst-build-governance/specs/sst-build-governance/spec.md`
- `openspec/changes/sst-build-governance/specs/shell-deployment-pipeline/spec.md`
- `docs/release-process.md` (SST Build Governance section)

### What's Implemented (Stub)

1. **Integration Points in Workflow** (`.github/workflows/deploy-shell.yml`):
   - SST Build immutability guardrail check (lines ~206-228)
   - SST Build promotion job with authorization, canonical ID generation, and evidence persistence steps (lines ~531-611)
   - All steps clearly marked with `⚠️ STUB` indicators
   - Comments reference requirements (SSTG-1-6, SDP-1-2)

2. **Promotion Script** (`scripts/azure/sst-build-promotion.sh`):
   - Stub functions for authorization, canonical ID generation, evidence persistence, and active SST Build management
   - Clear TODO markers for production implementation
   - Executable demonstration showing the intended flow

3. **Documentation**:
   - Policy and contracts in `docs/release-process.md`
   - Glossary entries in `CONTEXT.md`
   - This implementation guide

### What's Missing (Requires Infrastructure)

The stub implementation **does not** execute the following production requirements:

1. ❌ **SST Build Metadata Store** - No persistent storage for SST Build records, canonical IDs, or active/retired status
2. ❌ **Authorization Integration** - No actual role verification (release manager or designated lead)
3. ❌ **Evidence Persistence** - No Azure Blob Storage integration for evidence bundles
4. ❌ **Immutability Enforcement** - Guardrail check always passes (does not query metadata store)
5. ❌ **Audit Logging** - No persistent audit trail for promotions, denials, or state transitions

## Requirements Coverage

| Requirement | Status      | Implementation Location                                                 |
| ----------- | ----------- | ----------------------------------------------------------------------- |
| **SSTG-1**  | ✅ Complete | `docs/release-process.md`, `CONTEXT.md` (terminology documented)        |
| **SSTG-2**  | ⚠️ Stub     | Workflow job `sst-build-promotion` step "Mark Active SST Build"         |
| **SSTG-3**  | ⚠️ Stub     | Workflow job `sst-build-promotion` step "Authorization Check"           |
| **SSTG-4**  | ⚠️ Stub     | Workflow step "Check SST Build Immutability Guardrail"                  |
| **SSTG-5**  | ✅ Complete | `docs/release-process.md` (N+1 blocker policy documented)               |
| **SSTG-6**  | ⚠️ Stub     | `sst-build-promotion.sh` functions + workflow "Persist Evidence Bundle" |
| **SDP-1**   | ⚠️ Stub     | Workflow step "Check SST Build Immutability Guardrail"                  |
| **SDP-2**   | ⚠️ Stub     | Workflow "Generate SST Build Canonical ID" + evidence persistence       |

## Production Implementation Roadmap

### Phase 1: Metadata Store (Foundation)

**Goal**: Persistent storage for SST Build records

**Tasks**:

1. Provision Azure Table Storage or CosmosDB for SST Build metadata
2. Define schema:
   - `PartitionKey`: Release train (e.g., `release-4.10`)
   - `RowKey`: Canonical ID (e.g., `4.10-12-a1b2c3d-9f84ab21`)
   - Columns: `status` (active/retired), `promotedAt`, `promotedBy`, `commitSha`, `manifestHash`, `evidencePath`
3. Implement query functions in `sst-build-promotion.sh`:
   - `get_active_sst_build(release_train)`
   - `set_active_sst_build(canonical_id)`
   - `retire_sst_build(canonical_id)`

**Verification**: Script can query and update metadata store

### Phase 2: Evidence Persistence

**Goal**: 180-day evidence bundle retention

**Tasks**:

1. Create Azure Blob Storage container `sst-evidence`
2. Configure lifecycle policy for 180-day minimum retention
3. Implement evidence bundle generation:
   - Capture manifest snapshot (JSON)
   - Resolve artifact URLs from deployment
   - Include approver, timestamp, commit SHA, test report link
4. Upload to `sst-evidence/sst-builds/<canonical-id>/evidence.json`
5. Link evidence path in metadata store record

**Verification**: Evidence bundle retrievable for 180 days post-promotion

### Phase 3: Authorization (GitHub Native - No Additional Implementation Needed)

**Goal**: Control who can promote SST Builds

**Authorization Model**: GitHub repository permissions + CODEOWNERS

**Implementation**: ✅ **Already implemented via GitHub native features**

1. **Repository Access Control**:
   - Only repository collaborators with push access to release branches can trigger promotions
   - Managed via GitHub repository settings → Collaborators and teams

2. **CODEOWNERS File**:
   - Create `.github/CODEOWNERS` to specify who can approve PRs to release branches:
     ```
     # Release branch protection - require approval from release team
     /apps/shells/     @myorg/release-team
     /apps/mfes/       @myorg/release-team
     ```

3. **Branch Protection Rules**:
   - Configure for `release-*` pattern:
     - ✅ Require pull request reviews (1+ approvers from CODEOWNERS)
     - ✅ Require status checks to pass
     - ✅ Restrict who can push (limit to release team)
     - ✅ Require linear history

**No custom authorization code needed** - GitHub enforces access control via:

- Push access → Who can merge to release branches
- CODEOWNERS → Who must approve changes
- Branch protection → Rules enforcement

**Verification**:

- Non-collaborators cannot push to release branches (GitHub denies)
- PRs to release branches require CODEOWNERS approval
- Direct pushes to protected branches denied unless authorized

### Phase 4: Immutability Guardrail Enforcement

**Goal**: Prevent overwriting active SST Build artifacts

**Tasks**:

1. In `deploy-shell.yml` "Check SST Build Immutability Guardrail" step:
   - Query metadata store for active SST Build on current release train
   - If active SST Build exists, compare target blob prefix with SST Build artifact paths
   - Deny deployment if target path matches active SST Build path
   - Allow deployment to SST Integration (floating pointer) paths
2. Log denied deployments to audit trail

**Verification**: Deployment to active SST Build path rejected, deployment to SST Integration succeeds

### Phase 5: Audit Logging

**Goal**: Persistent, queryable audit trail

**Tasks**:

1. Provision Azure Table Storage `sst-audit-log`
2. Log events:
   - Promotion attempts (approved/denied)
   - Active SST Build changes (mark active, retire)
   - Immutability guardrail violations
   - Authorization check results
3. Include: timestamp, actor, action, canonical ID, result, reason
4. Retention: 365 days minimum (compliance)

**Verification**: Audit log searchable, 365-day retention enforced

## Integration Testing

Once infrastructure is deployed, verify end-to-end flows:

### Test Case 1: Successful Promotion

1. Release manager triggers `sst-build-promotion` workflow
2. Authorization passes
3. Canonical ID generated: `4.10-12-a1b2c3d-9f84ab21`
4. Evidence bundle persisted to `sst-evidence/sst-builds/4.10-12-a1b2c3d-9f84ab21/evidence.json`
5. Metadata store updated: active SST Build = `4.10-12-a1b2c3d-9f84ab21`
6. Previous active SST Build retired (evidence preserved)
7. Audit log entry created

**Expected**: Promotion succeeds, exactly one active SST Build globally

### Test Case 2: Unauthorized Promotion Attempt

1. Non-release-manager triggers `sst-build-promotion` workflow
2. Authorization check fails
3. Workflow aborted
4. Audit log records denied attempt

**Expected**: Promotion denied, audit trail created

### Test Case 3: Immutability Guardrail

1. Active SST Build: `4.10-12-a1b2c3d-9f84ab21` at `website/release-4.10/sha-a1b2c3d4/`
2. New commit pushed to `release-4.10`
3. `deploy-shell.yml` triggered
4. Immutability guardrail queries metadata store
5. Detects active SST Build on `release-4.10`
6. Allows deployment to `website/release-4.10/` (SST Integration - floating pointer)
7. Denies deployment to `website/release-4.10/sha-a1b2c3d4/` (active SST Build - immutable)

**Expected**: SST Integration updated, active SST Build unchanged

### Test Case 4: N+1 Blocker Remediation

1. Active SST Build `N` fails validation
2. Fix merged to release branch
3. Release manager promotes new SST Build `N+1`
4. SST Build `N` retired (not modified)
5. SST Build `N+1` marked active

**Expected**: Two SST Builds in metadata (one retired, one active), both evidence bundles preserved

## Migration Path

**No breaking changes** - stub implementation coexists with existing deployment workflows:

1. **Now (Stub)**: Workflows continue as-is, stub steps are no-ops
2. **Phase 1-2**: Add metadata store + evidence persistence, workflows still work (just log more)
3. **Phase 3**: Enable authorization (soft launch: log-only mode first)
4. **Phase 4**: Enable immutability guardrail (soft launch: warning mode before enforcement)
5. **Phase 5**: Audit logging active

## Files Modified (This Implementation)

- `.github/workflows/deploy-shell.yml` - Added stub guardrail check and promotion job
- `scripts/azure/sst-build-promotion.sh` - Stub promotion script with integration points
- `scripts/azure/SST_BUILD_IMPLEMENTATION.md` - This file (implementation guide)

## References

- **Spec**: `openspec/changes/sst-build-governance/`
- **Policy**: `docs/release-process.md` (SST Build Governance section)
- **Glossary**: `CONTEXT.md` (SST Build, SST Integration entries)
- **Requirements**: SSTG-1-6, SDP-1-2

## Questions / Escalation

For production implementation decisions:

1. **Metadata store choice**: Azure Table Storage (cost-effective, simple) vs CosmosDB (overkill for this use case)?
2. **Authorization approach**: GitHub Environment Protection (Option B) vs GitHub Teams API (Option A)?
3. **Evidence format**: JSON flat file vs structured data in CosmosDB?
4. **Audit retention**: 365 days sufficient or longer?

---

**Status**: Stub implementation complete. Awaiting infrastructure provisioning decision for production rollout.
