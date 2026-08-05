# ADR-0010: Dev Preview Deployments and Immutable Dev Artifacts

## Status

Accepted (2026-08-05)

Extends [ADR-0009 A3 (Floating Pointers for Dev)](./0009-azure-blob-deployment-pipeline.md#a3-floating-pointers-for-dev)

## Context

ADR-0009 A3 established dev as a floating pointer: every push to `main` overwrites `mfes-dev/<mfe>/dev/` and `dev-shell/` root. This works for the basic use case (dev shell always loads latest) but has limitations:

1. **No reproducibility** - Cannot address a specific dev build by commit SHA after it's been overwritten
2. **Last-write-wins races** - Concurrent merges to `main` can race, leaving the "winner" indeterminate
3. **No pre-merge verification** - Pull requests must be verified on localhost; no isolated cloud preview environment
4. **No build provenance** - No machine-readable record of which commit produced which deployed artifact

This ADR extends A3 with **immutable commit-SHA artifacts** and **PR-scoped preview deployments** while preserving the existing floating pointer behavior for backward compatibility.

## Decision

### A1: Immutable SHA Paths Alongside Floating Dev Pointers

**Decision**: Dev deploys (push to `main`) publish to **both**:

- Floating pointer: `mfes-dev/<mfe>/dev/` or `dev-shell/` root (overwrit able, `no-cache`)
- Immutable SHA path: `mfes-dev/<mfe>/sha-<short8>/` or `dev-shell/sha-<short8>/` (write-once, `immutable`)

**Path Structure**:

```
mfes-dev/
  mfe-widget/
    dev/                    # floating pointer (ADR-0009 A3)
      remoteEntry.js
      build-info.json
    sha-a1b2c3d4/           # immutable SHA artifact (new)
      remoteEntry.js
      build-info.json
    sha-f5e6d7c8/
      remoteEntry.js
      build-info.json
```

**Rationale**:

- **Reproducibility**: Every commit produces an addressable artifact (`sha-<short>/`) for 30 days (lifecycle policy, see A4)
- **Debugging**: Developers can load exact build from 3 days ago to reproduce reported issue
- **Backward compatibility**: Floating `dev/` pointer unchanged; existing dev shell remotes.config.dev.json still works
- **No version management overhead**: SHA paths are addressed by commit hash, not semver

**Upload semantics**:

- SHA path uses conditional upload (`If-None-Match: *` equivalent: `--if-none-match "*"`)
- If workflow re-runs for same commit, SHA upload tolerates "already exists" (no-op)
- Floating pointer always overwrites (existing behavior preserved)

**Trade-offs**:

- Pro: Zero breaking changes to ADR-0009 dev behavior
- Pro: Enables "load dev shell from 2024-07-20 build" troubleshooting workflows
- Con: Dev storage grows (mitigated by 30-day TTL, see A4)

### A2: PR-Scoped Preview Deployments for Same-Repo PRs

**Decision**: When a same-repo pull request modifies MFEs or shell, deploy to `pr-<number>/` paths.

**Path Structure**:

```
mfes-dev/
  mfe-widget/
    pr-42/                  # PR #42 preview
      remoteEntry.js
      build-info.json
dev-shell/
  pr-42/
    index.html
    remotes.config.json     # auto-generated (changed MFEs → pr-42 URLs)
    build-info.json
```

**Preview Config Generation**:

- Read `apps/shells/website/public/remotes.config.dev.json`
- For each MFE changed in the PR (detected via Turborepo `--filter='[origin/main...HEAD]'`):
  - Rewrite `entryUrl` from `mfes-dev/<mfe>/dev/` to `mfes-dev/<mfe>/pr-<number>/`
- Unchanged MFEs keep `dev/` URLs (load from floating pointer)
- Result embedded in preview shell build

**Same-Repo Boundary**:

- Trigger: `pull_request` (not `pull_request_target`)
- Guard: `github.event.pull_request.head.repo.full_name == github.repository` on every job requesting `id-token: write`
- Fork PRs skip all deploy jobs (no Azure credentials granted)

**Sticky PR Comment**:

- Posted by `actions/github-script@v7` with `pull-requests: write`
- Lists preview shell URL and each deployed MFE entry URL
- Updated in place on subsequent pushes (find existing comment by body marker)

**Cleanup**:

- Trigger: `pull_request` type `closed` (merged or not)
- Workflow deletes all `mfes-dev/*/pr-<number>/` and `dev-shell/pr-<number>/` blobs
- Succeeds idempotently when no blobs exist
- Lifecycle policy deletes stale previews after 14 days as backstop (see A4)

**Rationale**:

- **Pre-merge verification**: Reviewers can click preview URL in PR comment and test live
- **Isolation**: PR 42's preview never affects PR 43's preview or dev/prod environments
- **Security**: Fork PRs cannot exfiltrate Azure credentials (OWASP untrusted code execution boundary)
- **No wasted artifacts**: Cleanup on close prevents preview accumulation

**Trade-offs**:

- Pro: Enables "preview this PR" links in review workflow
- Pro: Same-repo boundary prevents credential leakage to forks
- Con: Preview shell lacks SPA routing (same limitation as dev shell per ADR-0009 A5)
- Con: GitHub `pull-requests: write` permission required (scoped to comment job only)

### A3: Build Metadata Files

**Decision**: Upload `build-info.json` alongside all dev/SHA/preview artifacts.

**Schema**:

```json
{
  "commitSha": "a1b2c3d4e5f6...", // full 40-char SHA
  "runId": "12345678", // GitHub Actions run ID
  "workflow": "Deploy MFEs (Turborepo)", // workflow name
  "timestamp": "2026-08-05T14:23:00Z", // ISO-8601 UTC
  "prNumber": "42" // present for preview deploys only
}
```

**Purpose**:

- **Provenance**: "Which commit produced this deployed artifact?"
- **Debugging**: "This bug appeared after run #12345"
- **Verification**: Shell or MFE can `fetch('build-info.json')` and log metadata on load

**Rationale**:

- Machines can answer "what is deployed here" without git log archaeology
- Supports future "deploy this exact dev build to staging" promotion workflows (outside this ADR's scope)

### A4: Lifecycle Policies for Dev-Only Paths

**Decision**: Azure Storage lifecycle management policy deletes:

- `pr-*` prefixes: 14 days after last modification
- `sha-*` prefixes: 30 days after last modification
- Scoped to `mfes-dev` and `dev-shell` containers only (prod containers unaffected)

**Policy File**: `scripts/azure/lifecycle-policy.json`

**Rationale**:

- Bounds dev storage growth without manual cleanup
- TTLs are conventions (tunable via runbook)
- Workflow-based PR cleanup (on close) is primary; lifecycle policy is backstop for missed cleanups

**Trade-offs**:

- Pro: Automatic garbage collection
- Pro: 30-day SHA retention balances debugging needs vs storage cost
- Con: No indefinite historical dev builds (acceptable; use tags for permanent builds)

### A5: Concurrency Groups to Prevent Races

**Decision**:

- Dev deploys: group `deploy-mfe-<name>-dev` / `deploy-website-dev`, `cancel-in-progress: false` (serialize)
- Preview deploys: group `preview-pr-<number>`, `cancel-in-progress: true` (cancel stale)

**Rationale**:

- **Dev serialization**: Commit A's deploy completes before commit B's deploy starts → deterministic final state
- **Preview cancellation**: Superseded preview builds waste CI time; only newest push matters

## Alternatives Considered

### Alt 1: Single `dev-archive/` Container for SHA Paths

**Rejected**: Would require new container, new CORS config, new RBAC scope. Keeping SHA paths in same container as floating pointers is simpler (same origin, same permissions).

### Alt 2: Branch-Keyed Previews Instead of PR-Number-Keyed

**Rejected**: Branch names need sanitization for blob paths. PR number is 1:1 with review lifecycle and maps directly to `pull_request.number` event field.

### Alt 3: Runtime Query-Param Config Override for Preview Shell

Example: `https://.../dev-shell/index.html?mfe-widget=pr-42`

**Rejected**: Requires shell code changes. Build-time config generation (A2) is simpler and preserves "config is what you tested" guarantee.

### Alt 4: `pull_request_target` Trigger for Previews

**Rejected**: `pull_request_target` runs workflow from base branch with write token even for forks. Violates OWASP untrusted code execution boundary. Plain `pull_request` + same-repo guard is safer.

## Consequences

### Positive

- Developers can reproduce any dev build from last 30 days by commit SHA
- Reviewers can preview PRs in real Azure environment before merge
- Last-write-wins races eliminated by concurrency serialization
- Build provenance machine-readable via `build-info.json`
- Backward compatible with ADR-0009 A3 floating pointers
- Fork PRs cannot obtain Azure credentials

### Negative

- Dev storage grows (mitigated by 30-day lifecycle TTL)
- Preview shell lacks SPA routing (same as dev shell per ADR-0009 A5; acceptable)
- Adds workflow complexity (3 new jobs in preview workflow, 1 new cleanup workflow)

### Neutral

- SHA path TTL (30 days) and preview TTL (14 days) are conventions, tunable via lifecycle policy JSON
- Workflow changes are additive (no breaking changes to existing prod pipeline)

## Related Decisions

- [ADR-0009 A3 (Floating Pointers for Dev)](./0009-azure-blob-deployment-pipeline.md#a3-floating-pointers-for-dev) - Extended by this ADR
- [ADR-0009 A5 (SPA Routing Limitation)](./0009-azure-blob-deployment-pipeline.md#a5-spa-routing-workaround-accepted-limitation) - Applies to preview shell
- [ADR-0008 (Version Management)](./0008-version-management.md) - SHA paths are dev-only; prod still uses semver

## Implementation

- OpenSpec Change: `openspec/changes/dev-preview-deployments/`
- Workflows: `.github/workflows/deploy-mfes-turbo.yml`, `.github/workflows/deploy-website.yml` (extended), `.github/workflows/deploy-previews.yml`, `.github/workflows/cleanup-previews.yml` (new)
- Lifecycle Policy: `scripts/azure/lifecycle-policy.json`
- Runbook: `docs/runbooks/azure-blob-provisioning.md` (Task 1.5)

---

**Last Updated**: 2026-08-05
