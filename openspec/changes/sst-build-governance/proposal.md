# SST Build Governance

## Why

The current release-channel deployment model allows ongoing merges to continuously update release artifacts, which makes the validation target mutable during system testing. Validation requires a frozen, reproducible System Test Build (SST Build) so QA sign-off is stable, auditable, and not invalidated by unrelated merges.

## What Changes

- Introduce explicit SST governance separating immutable `SST Build` from mutable `SST Integration`.
- Require that only one SST Build is globally active for release sign-off at a time, even when multiple `release-X.Y` branches exist.
- Define promotion authority and freeze behavior: only release managers or designated leads MAY promote SST Builds.
- Require blocker remediation to produce a new promoted SST Build; in-place mutation of an active SST Build is prohibited.
- Standardize SST Build traceability with a canonical identifier format and evidence bundle requirements.
- Establish SST evidence retention period of 180 days.

## Capabilities

### New Capabilities

- `sst-build-governance`: Defines operational requirements for immutable system test builds, promotion authority, freeze semantics, and audit retention.

### Modified Capabilities

- `shell-deployment-pipeline`: Deployment behavior SHALL preserve active SST Build immutability during ongoing release-branch changes.
- `mfe-deployment-pipeline`: Deployment behavior SHALL preserve active SST Build immutability during ongoing release-branch changes.

## Impact

- **Processes**: Release management and QA validation workflows gain explicit promotion/freeze lifecycle controls.
- **Documentation**: `docs/release-process.md` and `CONTEXT.md` are aligned to canonical SST terminology and policy.
- **CI/CD**: Deployment workflows may need guardrails to prevent overwriting active SST Build artifacts.
- **Auditability**: SST validation records become reproducible through mandatory build identity and evidence retention rules.
